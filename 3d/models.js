/* ============================================================
   puff — real 3D product models (Three.js, global THREE)
   Bodies are lathed profiles, like real bottles. Used by the
   studio renderer (3d/render.html) and the live 3D viewer.
   Units: roughly decimetres; every product stands on y = 0.
   ============================================================ */
(function () {
  const COLORS = window.PUFF_COLORS, FLIPPII = window.PUFF_FLIPPII;

  /* ---------- color helpers ---------- */
  const hex2rgb = h => { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const rgb2hex = a => "#" + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const shade = (c, t) => mix(c, "#000000", t);
  const tint = (c, t) => mix(c, "#ffffff", t);
  const lum = c => { const [r, g, b] = hex2rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /* ---------- geometry helpers ---------- */
  const V = (x, y) => new THREE.Vector2(x, y);
  const D = Math.PI / 180;
  function arc(cx, cy, r, a0, a1, n = 10) {
    const o = [];
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D; o.push(V(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
    return o;
  }
  // bottom centre -> rounded base corner
  const base = (r, rr) => [V(0, 0), ...arc(r - rr, rr, rr, -90, 0, 10).slice(1)];
  // side -> rounded top corner -> centre
  const top = (r, y, rr) => [...arc(r - rr, y - rr, rr, 0, 90, 10), V(0, y)];
  function bez(p0, p1, p2, p3, n = 16) {
    const o = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      o.push(V(u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
               u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]));
    }
    return o;
  }
  // Seam at the back so it never faces the camera
  const lathe = (pts, seg = 160) => new THREE.LatheGeometry(pts, seg, Math.PI, Math.PI * 2);

  // Lid: straight wall with a fine parting groove, soft top edge, slightly recessed top
  function lidPts(r, y0, h, rr = .07) {
    const y1 = y0 + h;
    return [V(0, y0), V(r - .012, y0), V(r, y0 + .012),
      V(r, y0 + h * .45), V(r - .012, y0 + h * .47), V(r - .012, y0 + h * .53), V(r, y0 + h * .55),
      ...arc(r - rr, y1 - rr, rr, 0, 90, 10), V(r * .9, y1), V(r * .88, y1 - .012), V(0, y1 - .012)];
  }

  /* ---------- textures ---------- */
  let NOISE = null;
  function noise() {
    if (NOISE) return NOISE;
    const s = 256, d = new Uint8Array(s * s * 4);
    for (let i = 0; i < s * s; i++) { const v = 110 + Math.random() * 40; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    NOISE = new THREE.DataTexture(d, s, s);
    NOISE.wrapS = NOISE.wrapT = THREE.RepeatWrapping;
    NOISE.repeat.set(16, 32);
    NOISE.needsUpdate = true;
    return NOISE;
  }

  function textCanvas(draw, w = 1024, h = 256) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  const logoColor = hex => lum(hex) > .55 ? shade(hex, .42) : mix(hex, "#f6dccd", .74);

  /* ---------- materials ---------- */
  function matte(hex) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex), roughness: .52, metalness: 0,
      clearcoat: .25, clearcoatRoughness: .5,
      sheen: .35, sheenRoughness: .7, sheenColor: new THREE.Color(tint(hex, .5)),
      bumpMap: noise(), bumpScale: .35, envMapIntensity: 1,
    });
  }
  function silicone(hex) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex), roughness: .62, metalness: 0,
      sheen: .5, sheenRoughness: .6, sheenColor: new THREE.Color(tint(hex, .4)), envMapIntensity: .8,
    });
  }
  function satin(hex) {
    return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: .42, clearcoat: .3, clearcoatRoughness: .35, bumpMap: noise(), bumpScale: .6 });
  }

  function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }

  // "puff" wrapped onto the body as a thin decal band
  function logo(hex, rBot, rTop, yc, h, opts = {}) {
    const col = opts.color || logoColor(hex);
    const tex = textCanvas((g, w, H) => {
      g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `300 ${H * .82}px Outfit, Manrope, sans-serif`;
      g.fillText("puff", w / 2, H * .44);
    });
    const r = (rBot + rTop) / 2, arcLen = (h * 4) / r;
    const geo = new THREE.CylinderGeometry(rTop + .004, rBot + .004, h, 64, 1, true, -arcLen / 2, arcLen);
    const metallic = lum(hex) <= .55;
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex, transparent: true, roughness: metallic ? .35 : .55, metalness: metallic ? .35 : .05,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const m = new THREE.Mesh(geo, mat); m.position.y = yc; return m;
  }

  function straw(hex, r, y0, y1, x = 0, z = 0) {
    const len = y1 - y0 - 2 * r;
    const m = mesh(new THREE.CapsuleGeometry(r, len, 8, 32), silicone(hex));
    m.position.set(x, (y0 + y1) / 2, z);
    const g = new THREE.Group(); g.add(m);
    const grommet = mesh(new THREE.TorusGeometry(r * 1.5, r * .45, 12, 32), silicone(shade(hex, .25)));
    grommet.rotation.x = Math.PI / 2; grommet.position.set(x, y0 + .01, z); g.add(grommet);
    return g;
  }

  /* ---------- products ---------- */
  const P = {
    sip(c) {
      const g = new THREE.Group(), m = matte(c);
      const s = bez([.60, 1.28], [.60, 1.5], [.75, 1.45], [.75, 1.68]);
      g.add(mesh(lathe([...base(.60, .17), V(.60, 1.28), ...s, V(.75, 3.40), V(.74, 3.46), V(0, 3.46)]), m));
      g.add(mesh(lathe(lidPts(.79, 3.42, .42, .08)), matte(c)));
      g.add(straw(shade(c, .08), .06, 3.82, 4.72));
      g.add(logo(c, .60, .60, .55, .42));
      return g;
    },

    grippii(c) {
      const g = new THREE.Group(), m = matte(c);
      g.add(mesh(lathe([...base(.55, .18), V(.70, 3.42), V(.69, 3.48), V(0, 3.48)]), m));
      g.add(mesh(lathe(lidPts(.74, 3.44, .40, .08)), matte(c)));
      // two slots on the lid
      [[-.32, .12, .4], [.32, .12, -.4]].forEach(([x, z, r]) => {
        const s = mesh(new THREE.BoxGeometry(.16, .02, .035), satin(shade(c, .45)));
        s.position.set(x, 3.833, z); s.rotation.y = r; g.add(s);
      });
      g.add(straw(shade(c, .1), .06, 3.82, 4.62, .06, -.05));
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.60, 3.02, 0), new THREE.Vector3(-.92, 3.02, 0), new THREE.Vector3(-1.08, 2.88, 0),
        new THREE.Vector3(-1.10, 2.4, 0), new THREE.Vector3(-1.07, 2.05, 0), new THREE.Vector3(-.92, 1.92, 0), new THREE.Vector3(-.56, 1.92, 0)]);
      const h = mesh(new THREE.TubeGeometry(curve, 96, .11, 20), matte(c));
      const hg = new THREE.Group(); hg.add(h); hg.rotation.y = -.45; g.add(hg);
      const r = y => .55 + .15 * (y - .18) / 3.24;
      g.add(logo(c, r(.44), r(.84), .64, .4));
      return g;
    },

    bottll(c) {
      const g = new THREE.Group();
      g.add(mesh(lathe([...base(.60, .2), V(.60, 2.74), ...bez([.60, 2.74], [.60, 3.32], [.32, 3.22], [.32, 3.72]), V(.31, 3.74), V(0, 3.74)]), matte(c)));
      g.add(mesh(lathe([V(0, 3.70), V(.36, 3.70), V(.365, 3.72), V(.365, 3.78), V(.36, 3.80), V(0, 3.80)]), satin(shade(c, .25))));
      g.add(mesh(lathe([V(0, 3.79), V(.345, 3.79), ...top(.345, 4.62, .12)]), matte(c)));
      const lg = logo(c, .60, .60, 1.25, .40); lg.rotation.z = -.05; g.add(lg);
      return g;
    },

    slim(c) {
      const g = new THREE.Group();
      g.add(mesh(lathe([...base(.48, .16), V(.48, 3.34), V(0, 3.34)]), matte(c)));
      g.add(mesh(lathe(lidPts(.51, 3.30, .36, .06)), matte(c)));
      g.add(straw(shade(c, .08), .05, 3.64, 4.55));
      g.add(logo(c, .48, .48, .52, .26));
      return g;
    },

    mini(c, o = {}) {
      const g = new THREE.Group();
      g.add(mesh(lathe([...base(.52, .18), V(.52, 2.36), V(0, 2.36)]), matte(c)));
      g.add(mesh(lathe(lidPts(.55, 2.32, .38, .07)), matte(c)));
      g.add(straw(shade(c, .06), .055, 2.68, 3.72));
      if (o.sleeve) {
        g.add(mesh(lathe([V(.52, .80), V(.545, .82), V(.548, 1.25), V(.545, 1.68), V(.52, 1.70)]), silicone("#1d1e21")));
        const tex = textCanvas((x, w, h) => {
          x.strokeStyle = x.fillStyle = "#ece8e2"; x.lineWidth = 9; x.textAlign = "center";
          x.beginPath(); x.moveTo(w / 2, h * .1); x.bezierCurveTo(w / 2 - 20, h * .22, w / 2 - 42, h * .3, w / 2 - 42, h * .37);
          x.arc(w / 2, h * .37, 42, Math.PI, 0, true); x.bezierCurveTo(w / 2 + 42, h * .3, w / 2 + 20, h * .22, w / 2, h * .1); x.stroke();
          x.font = `300 ${h * .3}px Outfit, Manrope, sans-serif`; x.textBaseline = "middle"; x.fillText("puff", w / 2, h * .72);
        }, 512, 512);
        const arcLen = .62 / .55;
        const d = new THREE.Mesh(new THREE.CylinderGeometry(.553, .553, .62, 48, 1, true, -arcLen / 2, arcLen),
          new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        d.position.y = 1.25; g.add(d);
        g.add(logo(c, .52, .52, .44, .2));
      } else {
        g.add(logo(c, .52, .52, .5, .28));
      }
      return g;
    },

    koffii(c) {
      const g = new THREE.Group(), lid = "#1d1e21";
      g.add(mesh(lathe([...base(.50, .30), V(.50, 2.70), V(0, 2.70)]), matte(c)));
      g.add(mesh(lathe([V(0, 2.68), V(.525, 2.68), V(.53, 2.70), V(.53, 3.08), V(.522, 3.09), V(.522, 3.11), V(.53, 3.12),
        ...arc(.48, 3.30, .05, 0, 90, 8), V(.44, 3.35), V(.42, 3.31), V(0, 3.31)]), satin(lid)));
      const sip = mesh(new THREE.CapsuleGeometry(.03, .16, 6, 16), satin("#0c0c0d"));
      sip.rotation.z = Math.PI / 2; sip.position.set(0, 3.335, .3); g.add(sip);
      g.add(logo(c, .50, .50, .95, .34));
      return g;
    },

    flippii(k) {
      const j = FLIPPII[k], g = new THREE.Group();
      g.add(mesh(lathe([...base(.56, .24), V(.56, 2.44), V(0, 2.44)]), matte(j.hex)));
      const band = [V(0, 2.40), V(.585, 2.40)];
      for (let i = 0; i <= 10; i++) band.push(V(.585 + (i % 2 ? .006 : 0), 2.42 + i * .036));
      band.push(V(0, 2.80));
      g.add(mesh(lathe(band), silicone(j.band)));
      const dome = [V(0, 2.78)];
      for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; dome.push(V(.58 * Math.pow(Math.cos(a), .55), 2.78 + .68 * Math.pow(Math.sin(a), 1.3))); }
      g.add(mesh(lathe(dome), matte(j.lid)));
      const btn = mesh(new THREE.SphereGeometry(1, 48, 24), silicone(j.btn));
      btn.scale.set(.3, .06, .22); btn.position.set(0, 3.41, .1); btn.rotation.x = .28; g.add(btn);
      const loop = mesh(new THREE.TorusGeometry(.2, .065, 20, 64), matte(shade(j.lid, .1)));
      loop.position.set(.55, 3.12, -.2); loop.rotation.y = Math.PI / 2 + .5; g.add(loop);
      g.add(logo(j.hex, .56, .56, 1.15, .36));
      return g;
    },

    looppii(c) {
      const g = new THREE.Group();
      g.add(mesh(lathe([...base(.62, .26), V(.62, 1.86), V(0, 1.86)]), matte(c)));
      g.add(mesh(lathe([V(0, 1.82), V(.65, 1.82), V(.66, 1.84), ...top(.66, 2.28, .12)]), matte(c)));
      const sp = mesh(new THREE.CapsuleGeometry(.09, .5, 8, 32), silicone(tint(c, .05))); sp.position.y = 2.6; g.add(sp);
      const col = mesh(new THREE.TorusGeometry(.13, .04, 12, 32), silicone(shade(c, .1))); col.rotation.x = Math.PI / 2; col.position.y = 2.29; g.add(col);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.6, 2.12, 0), new THREE.Vector3(-.82, 2.6, 0), new THREE.Vector3(-.62, 3.15, 0),
        new THREE.Vector3(-.2, 3.12, 0), new THREE.Vector3(-.06, 2.86, 0)]);
      const lp = mesh(new THREE.TubeGeometry(curve, 80, .065, 16), silicone(shade(c, .04)));
      const lg = new THREE.Group(); lg.add(lp); lg.rotation.y = -.5; g.add(lg);
      const knob = mesh(new THREE.SphereGeometry(.08, 24, 16), silicone(shade(c, .15))); knob.position.set(-.6 * Math.cos(.5), 2.12, -.6 * Math.sin(.5)); g.add(knob);
      g.add(logo(c, .62, .62, .78, .36));
      return g;
    },
  };

  /* ---------- accessories ---------- */
  const A = {
    topper(hex) {
      const g = new THREE.Group();
      [.42, 1.14].forEach(y => { const m = mesh(new THREE.CapsuleGeometry(.24, .24, 10, 40), silicone(hex)); m.position.y = y; g.add(m); });
      return g;
    },
    lids(list) {
      const g = new THREE.Group();
      const pos = [[-.62, .45], [.55, .5], [-.25, -.62], [.85, -.55]];
      list.forEach((hex, i) => {
        const l = mesh(lathe([V(0, 0), V(.42, 0), ...arc(.42, .08, .08, -90, 90, 12).slice(1), V(.38, .16), V(.36, .14), V(.14, .14), V(.12, .17), V(0, .17)]), silicone(hex));
        l.position.set(pos[i][0], 0, pos[i][1]); g.add(l);
        const slit = mesh(new THREE.BoxGeometry(.1, .02, .018), satin(shade(hex, .45))); slit.position.set(pos[i][0], .18, pos[i][1]); g.add(slit);
      });
      return g;
    },
    straws(list) {
      const g = new THREE.Group();
      list.forEach((hex, i) => {
        const m = mesh(new THREE.CapsuleGeometry(.05, 2.6, 8, 24), silicone(hex));
        m.rotation.z = Math.PI / 2; m.position.set(0, .05, (i - 1.5) * .16);
        g.add(m);
      });
      g.rotation.y = .5;
      return g;
    },
    brush() {
      const g = new THREE.Group(), steel = new THREE.MeshPhysicalMaterial({ color: 0xb9bcc2, metalness: 1, roughness: .3 });
      const rod = mesh(new THREE.CylinderGeometry(.018, .018, 2.6, 12), steel); rod.rotation.z = Math.PI / 2; g.add(rod);
      const ring = mesh(new THREE.TorusGeometry(.1, .018, 10, 32), steel); ring.position.x = 1.4; g.add(ring);
      const geo = new THREE.CylinderGeometry(.006, .006, .2, 5), mat = new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: .7 });
      const n = 900, inst = new THREE.InstancedMesh(geo, mat, n), o = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const x = -1.25 + (i / n) * .9, a = i * 2.4;
        o.position.set(x, 0, 0); o.rotation.set(a, 0, 0); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
      }
      inst.castShadow = true; g.add(inst);
      g.position.y = .12; g.rotation.y = .45;
      return g;
    },
  };

  function build(type, key, opts = {}) {
    if (type === "group") {
      // key: [{ t, k, o, x, z, ry }] — several products arranged in one scene
      const g = new THREE.Group();
      key.forEach(it => {
        const p = build(it.t, it.k, it.o || {}); p.rotation.y = it.ry || 0;
        const s = new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3());
        const cs = contactShadow(), d = Math.min(s.x, s.z) * 1.6; cs.scale.set(d, d, 1); p.add(cs);
        p.position.set(it.x || 0, 0, it.z || 0); g.add(p);
      });
      g.userData.group = true;
      return g;
    }
    if (type === "flippii") return P.flippii(key);
    if (A[type]) return A[type](key);
    return P[type](COLORS[key].hex, opts);
  }

  // soft contact shadow (a radial gradient on the floor)
  let CONTACT_TEX = null;
  function contactShadow() {
    if (!CONTACT_TEX) {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const x = c.getContext("2d"), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(.5, "rgba(0,0,0,.18)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      CONTACT_TEX = new THREE.CanvasTexture(c);
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: CONTACT_TEX, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = .002;
    return m;
  }

  /* ---------- studio: soft reflections, key/fill/rim, shadow catcher ---------- */
  function studio(renderer) {
    const scene = new THREE.Scene();
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x303034, side: THREE.BackSide }));
    room.position.y = 4; env.add(room);
    const panel = (w, h, x, y, z, s) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(s), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 2, 0); env.add(m);
    };
    panel(6, 9, -7, 5, 4, 4.6);   // big key softbox, front-left
    panel(2.4, 9, 7, 4, 2, 1.4);    // fill strip, right
    panel(8, 4, 0, 10, 0, 2.6);  // top
    panel(1.6, 9, 5, 4, -6, 4.2);   // rim strip, back-right
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, .04).texture;

    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(-2.5, 12, 4.5); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -.0004;
    key.shadow.mapSize.set(4096, 4096);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4, near: .5, far: 30 });
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff6ee, .35); fill.position.set(4, 3, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, .6); rim.position.set(3, 4, -5); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d0c8, .12));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .16 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const contact = contactShadow(); scene.add(contact);

    return { scene, contact };
  }

  // Frame the camera on a product: slight high angle, padded fit
  function frame(camera, obj, aspect, elevDeg = 8, pad = 1.1) {
    const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const v = camera.fov * D / 2;
    const d = Math.max((size.y * pad) / 2 / Math.tan(v), (Math.max(size.x, size.z) * pad) / 2 / (Math.tan(v) * aspect)) + Math.max(size.x, size.z) / 2;
    const e = elevDeg * D;
    camera.aspect = aspect;
    camera.position.set(ctr.x, ctr.y + Math.sin(e) * d, ctr.z + Math.cos(e) * d);
    camera.lookAt(ctr);
    camera.updateProjectionMatrix();
    return { box, size };
  }

  window.PuffModels = { build, studio, frame, products: Object.keys(P), accessories: Object.keys(A) };
})();
