/* puff — live 3D product viewer (drag to spin, scroll/pinch to zoom) */
(function () {
  const stage = document.getElementById("viewerStage");
  let renderer, scene, contact, camera, group, raf, cfg;
  let rotY = -.35, rotX = 0, velocity = 0, zoom = 1, dragging = false, lastX = 0, lastY = 0, idle = 0;
  const pointers = new Map(); let pinch0 = 0, zoom0 = 1;

  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    ({ scene, contact } = PuffModels.studio(renderer));
    camera = new THREE.PerspectiveCamera(22, 1, .1, 100);
    stage.appendChild(renderer.domElement);

    const el = renderer.domElement;
    el.addEventListener("pointerdown", e => {
      el.setPointerCapture(e.pointerId); pointers.set(e.pointerId, e);
      dragging = true; lastX = e.clientX; lastY = e.clientY; velocity = 0; idle = 0;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); zoom0 = zoom; }
    });
    el.addEventListener("pointermove", e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, e);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        zoom = clampZoom(zoom0 * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch0);
        return;
      }
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      rotY += dx * .01; velocity = dx * .01;
      rotX = Math.max(-.35, Math.min(.5, rotX + dy * .005));
    });
    const up = e => { pointers.delete(e.pointerId); if (!pointers.size) dragging = false; };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", e => { e.preventDefault(); zoom = clampZoom(zoom * (e.deltaY < 0 ? 1.08 : .93)); }, { passive: false });
    new ResizeObserver(resize).observe(stage);
  }
  const clampZoom = z => Math.max(.7, Math.min(2.4, z));

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function setProduct(key) {
    cfg.current = key;
    if (group) scene.remove(group);
    group = PuffModels.build(cfg.type, key, cfg.opts);
    // centre on the vertical axis so it spins in place
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const pivot = new THREE.Group(); pivot.add(group); group = pivot;
    scene.add(group);
    cfg.size = size;
    const s = Math.max(size.x, size.z) * 1.5; contact.scale.set(s, s, 1);
    document.querySelectorAll("#viewerSwatches .sw").forEach(b => b.classList.toggle("is-active", b.dataset.k === key));
  }

  function frame() {
    const size = cfg.size, v = camera.fov * Math.PI / 360;
    const d = Math.max(size.y * 1.25 / 2 / Math.tan(v), Math.max(size.x, size.z) * 1.6 / 2 / (Math.tan(v) * camera.aspect)) / zoom;
    const e = .14 + rotX;
    camera.position.set(0, size.y / 2 + Math.sin(e) * d, Math.cos(e) * d);
    camera.lookAt(0, size.y / 2, 0);
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!dragging) {
      velocity *= .94;
      idle++;
      rotY += velocity + (idle > 90 ? .004 : 0);
    }
    group.rotation.y = rotY;
    frame();
    renderer.render(scene, camera);
  }

  window.PuffViewer = {
    open(c) {
      cfg = c;
      if (!renderer) init();
      document.getElementById("viewerName").textContent = c.name;
      document.getElementById("viewerStatus").hidden = true;
      const sw = document.getElementById("viewerSwatches");
      sw.innerHTML = c.colors.map(o => `<button class="sw" data-k="${o.key}" style="background:${o.hex}" aria-label="${o.name}" title="${o.name}"></button>`).join("");
      sw.querySelectorAll(".sw").forEach(b => b.addEventListener("click", () => setProduct(b.dataset.k)));
      rotY = -.35; rotX = 0; zoom = 1; velocity = 0; idle = 0;
      setProduct(c.current);
      resize();
      cancelAnimationFrame(raf); loop();
    },
    close() { cancelAnimationFrame(raf); },
  };
})();
