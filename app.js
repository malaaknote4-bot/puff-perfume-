/* ============================================================
   puff — product renderer + page interactions
   Products are drawn as shaded SVG "3D" renders, so any
   colorway can be shown without photography.
   ============================================================ */

const COLORS = window.PUFF_COLORS;
const FLIPPII = window.PUFF_FLIPPII;
const colorOf = k => COLORS[k] || FLIPPII[k];

/* ---------- Products (names/copy are placeholders where noted) ---------- */
const PRODUCTS = [
  { id: "sip", group: "main", name: "The Sip", type: "sip", tag: "Bestseller",
    desc: "Wide-mouth tumbler with a straw lid and a tapered base that fits most cup holders.",
    feats: ["Straw lid", "Cup-holder base", "Insulated"],
    colors: ["plum", "ice", "coral", "butter", "slate", "wine", "cobalt", "onyx", "forest"] },
  { id: "grippii", group: "main", name: "GRIPPII", type: "grippii", tag: "New",
    desc: "Our big-day tumbler, with a sturdy side handle and a straw lid. Dress the straw with a topper.",
    feats: ["Handle", "Straw lid", "Insulated"],
    colors: ["lilac", "onyx", "taupe", "tangerine", "aqua", "blush", "sunflower", "scarlet", "cobalt", "rose", "plum", "forest"] },
  { id: "bottll", group: "main", name: "BOTTLL", type: "bottll", tag: "Signature",
    desc: "A slim bottle with a screw cap that slides into a tote, a gym bag or a car door.",
    feats: ["Screw cap", "Slim profile", "Insulated"],
    colors: ["yarrow", "seafoam", "onyx", "lilac"] },
  { id: "mini", group: "main", name: "The Mini", type: "mini", tag: "Poolside", sleeve: true,
    desc: "A compact straw tumbler for the pool, the beach and the school run. Add the sleeve for extra grip.",
    feats: ["Straw lid", "Swap lids", "Optional sleeve"],
    colors: ["blush", "aqua", "butter", "tangerine", "raspberry", "olive", "sky", "cream", "turquoise"] },
  { id: "koffii", group: "main", name: "KOFFII", type: "koffii", tag: "Coffee",
    desc: "A travel cup for your morning coffee, with a twist-on sip lid and a rounded base that sits steady.",
    feats: ["Sip lid", "Hot or cold", "One-hand hold"],
    colors: ["cocoa", "onyx", "sage", "cream", "plum"] },
  { id: "slim", group: "main", name: "The Slim", type: "slim", tag: "Everyday",
    desc: "A straight-sided straw tumbler, light enough to carry from desk to dinner.",
    feats: ["Straw lid", "Bag-friendly"],
    colors: ["mint", "slate", "navy", "wine", "sage", "rose", "blush", "butter", "onyx"] },
  { id: "flippii", group: "kids", name: "FLIPPII", type: "flippii", tag: "Little ones",
    desc: "A flip-top bottle with a push button and carry loop, sized for school bags and short outings.",
    feats: ["Flip-top spout", "Carry loop", "Leak-proof"],
    colors: Object.keys(FLIPPII) },
  { id: "looppii", group: "kids", name: "LOOPPII", type: "looppii", tag: "Back soon", soldOut: true,
    desc: "A first cup with a soft silicone spout and a loop handle that is easy for small hands.",
    feats: ["Silicone spout", "Loop handle", "Insulated"],
    colors: ["raspberry", "blush", "tangerine", "cocoa", "slate"] },
];

/* ---------- Color math ---------- */
const hex2rgb = h => { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
const rgb2hex = a => "#" + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
const shade = (c, t) => mix(c, "#000000", t);
const tint = (c, t) => mix(c, "#ffffff", t);
const lum = c => { const [r, g, b] = hex2rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/* ---------- Product images (pre-rendered in 3D by 3d/render.html) ---------- */
const NEEDED = new Map();
function need(file, type, key, opts, w = 1600, h = 2000, elev = 8) {
  if (!NEEDED.has(file)) NEEDED.set(file, { file, type, key, opts: opts || {}, w, h, elev });
  return (window.PUFF_IMG && window.PUFF_IMG[file]) || `img/${file}.webp`;
}
function render(type, key, label, opts) {
  const sleeve = opts && opts.sleeve;
  const file = `${type}-${key}${sleeve ? "-sleeve" : ""}`;
  const name = colorOf(key) ? colorOf(key).name : key;
  return `<img class="render" src="${need(file, type, key, sleeve ? { sleeve: true } : {})}" alt="${label || ""} in ${name}" loading="lazy" decoding="async">`;
}
const topper = (name, hex) =>
  `<img class="render" src="${need("topper-" + name.toLowerCase(), "topper", hex, {}, 800, 1400, 10)}" alt="${name} straw topper" loading="lazy">`;
const EXTRAS = [
  { name: "Swap lids", desc: "Change the look of a Mini in seconds.", file: "extra-lids", type: "lids", key: ["#e8e0cf", "#323a58", "#e8dc78", "#86d3bd"] },
  { name: "Silicone straws", desc: "Soft, reusable spare straws in every shade.", file: "extra-straws", type: "straws", key: ["#ec7a2c", "#e2687a", "#ece8e2", "#8fd8d6"] },
  { name: "Cleaning brush", desc: "Reaches the whole straw for a proper clean.", file: "extra-brush", type: "brush", key: null },
];

/* ---------- Page build ---------- */
const $ = s => document.querySelector(s);
const swatchBg = hex => `linear-gradient(160deg, ${tint(hex, .82)}, ${tint(hex, .62)})`;

// Hero lineup
const HERO = [
  { t: "slim", k: "mint", x: -2.75, z: -.5 }, { t: "grippii", k: "lilac", x: -1.45, z: .15, ry: .25 },
  { t: "sip", k: "plum", x: .05, z: -.45 }, { t: "bottll", k: "yarrow", x: 1.45, z: .2 }, { t: "koffii", k: "cocoa", x: 2.7, z: .55 }];
$("#heroStage").innerHTML = `<img class="render" src="${need("hero-lineup", "group", HERO, {}, 2600, 1800, 7)}" alt="The puff lineup: Slim, GRIPPII, Sip, BOTTLL and KOFFII" fetchpriority="high">`;

// Marquee
const mq = Object.values(COLORS).map(c => `<span><i style="background:${c.hex}"></i>${c.name}</span>`).join("");
$("#marquee").innerHTML = mq + mq;

// Products
$("#products").innerHTML = PRODUCTS.map(pr => {
  const first = pr.colors[0];
  return `<article class="product${pr.group === "kids" ? " is-hidden" : ""}" data-id="${pr.id}" data-group="${pr.group}">
    <div class="product__stage" style="background:${swatchBg(colorOf(first).hex)}">
      <span class="product__tag${pr.soldOut ? " product__tag--soon" : ""}">${pr.tag}</span>
      <button class="product__3d" aria-label="View ${pr.name} in 3D"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>View in 3D</button>
      ${pr.sleeve ? `<button class="product__toggle" aria-pressed="false">+ Sleeve</button>` : ""}
      ${render(pr.type, first, pr.name)}
    </div>
    <div class="product__meta"><h3>${pr.name}</h3><span class="product__shade">${colorOf(first).name}</span></div>
    <p>${pr.desc}</p>
    <div class="product__feats">${pr.feats.map(f => `<span>${f}</span>`).join("")}</div>
    <div class="product__foot">
      <div class="swatches">${pr.colors.map((k, i) =>
        `<button class="sw${i ? "" : " is-active"}" data-k="${k}" style="background:${colorOf(k).hex}" aria-label="${colorOf(k).name}" title="${colorOf(k).name}"></button>`).join("")}
      </div>
      <button class="btn ${pr.soldOut ? "btn--ghost" : "btn--dark"} add">${pr.soldOut ? "Notify me" : "Add to bag"}</button>
    </div>
  </article>`;
}).join("");

document.querySelectorAll(".product").forEach(card => {
  const pr = PRODUCTS.find(p => p.id === card.dataset.id);
  const stage = card.querySelector(".product__stage");
  const state = { color: pr.colors[0], sleeve: false };
  const redraw = () => { stage.querySelector(".render").outerHTML = render(pr.type, state.color, pr.name, { sleeve: state.sleeve }).replace("<img ", "<img data-fade "); };

  card.querySelectorAll(".sw").forEach(sw => sw.addEventListener("click", () => {
    state.color = sw.dataset.k;
    card.querySelectorAll(".sw").forEach(s => s.classList.toggle("is-active", s === sw));
    redraw();
    stage.style.background = swatchBg(colorOf(state.color).hex);
    card.querySelector(".product__shade").textContent = colorOf(state.color).name + (state.sleeve ? " + sleeve" : "");
  }));

  const tog = card.querySelector(".product__toggle");
  if (tog) tog.addEventListener("click", () => {
    state.sleeve = !state.sleeve;
    tog.setAttribute("aria-pressed", state.sleeve);
    tog.textContent = state.sleeve ? "− Sleeve" : "+ Sleeve";
    redraw();
    card.querySelector(".product__shade").textContent = colorOf(state.color).name + (state.sleeve ? " + sleeve" : "");
  });

  // subtle 3D tilt
  stage.addEventListener("mousemove", e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    stage.querySelector(".render").style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 8}deg) scale(1.03)`;
  });
  stage.addEventListener("mouseleave", () => stage.querySelector(".render").style.transform = "");

  card.querySelector(".product__3d").addEventListener("click", () => openViewer(pr, state));
  // register every colorway image (and sleeve versions) for the renderer
  pr.colors.forEach(k => { render(pr.type, k); if (pr.sleeve) render(pr.type, k, "", { sleeve: true }); });

  card.querySelector(".add").addEventListener("click", () => {
    const c = colorOf(state.color);
    if (pr.soldOut) return toast(`<i style="background:${c.hex}"></i>We'll tell you when ${pr.name} is back`);
    addToBag(`${pr.name} — ${c.name}${state.sleeve ? " + sleeve" : ""}`, c.hex);
  });
});

// Collection tabs
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(t => { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", t === tab); });
  document.querySelectorAll(".product").forEach(p => p.classList.toggle("is-hidden", p.dataset.group !== tab.dataset.group));
}));

// Feature (BOTTLL)
const FEAT = ["yarrow", "seafoam", "onyx", "lilac"];
function setFeature(k) {
  $("#featureVisual").innerHTML = render("bottll", k, "BOTTLL");
  $("#featureVisual").style.background = `radial-gradient(circle at 50% 40%, ${tint(COLORS[k].hex, .25)}, ${shade(COLORS[k].hex, .35)})`;
  document.querySelectorAll("#featureSwatches .sw").forEach(s => s.classList.toggle("is-active", s.dataset.k === k));
}
$("#featureSwatches").innerHTML = FEAT.map(k =>
  `<button class="sw" data-k="${k}" style="background:${COLORS[k].hex}" aria-label="${COLORS[k].name}" title="${COLORS[k].name}"></button>`).join("");
document.querySelectorAll("#featureSwatches .sw").forEach(s => s.addEventListener("click", () => setFeature(s.dataset.k)));
setFeature("yarrow");

// Straw toppers + extras
const GRIP = [["Rose", "#ec7fa0"], ["Lilac", "#b6a5e2"], ["Butter", "#ece27a"], ["Aqua", "#7fd8cf"]];
$("#grippiiCards").innerHTML = GRIP.map(([n, h]) =>
  `<div class="gcard"><div class="gcard__blister">${topper(n, h)}</div><span class="gcard__name">Topper · ${n}</span></div>`).join("");
$("#extras").innerHTML = EXTRAS.map(e =>
  `<article class="extra reveal"><div class="extra__art"><img class="render" src="${need(e.file, e.type, e.key, {}, 1600, 1000, 58)}" alt="${e.name}" loading="lazy"></div><h3>${e.name}</h3><p>${e.desc}</p></article>`).join("");

// Color wall
const WALL_TYPE = { deep: "sip", neutrals: "koffii", pastels: "mini", brights: "bottll" };
$("#swatchGrid").innerHTML = Object.entries(COLORS).map(([k, c]) =>
  `<div class="tile" data-mood="${c.mood}" style="background:${swatchBg(c.hex)}; color:${shade(c.hex, .6)}">
    ${render(WALL_TYPE[c.mood], k)}
    <span class="tile__name">${c.name}</span>
  </div>`).join("");
document.querySelectorAll(".chip").forEach(chip => chip.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("is-active", c === chip));
  const m = chip.dataset.mood;
  document.querySelectorAll(".tile").forEach(t => t.classList.toggle("is-hidden", m !== "all" && t.dataset.mood !== m));
}));

// Moments
const MOMENTS = [
  { id: "commute", t: "The commute", d: "Fits the cup holder. Survives the traffic.", bg: "#2f3550", fg: "#fff", items: [["sip", "cobalt"], ["koffii", "cream"]] },
  { id: "studio", t: "The studio", d: "A big handle and a big pour for the last set.", bg: "#ebbccb", fg: "#3d1a37", items: [["grippii", "plum"], ["grippii", "blush"]] },
  { id: "pool", t: "The pool", d: "Short, sturdy and easy to spot on the sun lounger.", bg: "#2f7f86", fg: "#fff", items: [["mini", "blush"], ["mini", "butter", { sleeve: true }], ["mini", "tangerine"]] },
];
$("#moments").innerHTML = MOMENTS.map(m =>
  `<article class="moment reveal" style="background:${m.bg}; color:${m.fg}">
    <div class="moment__art"><img class="render" src="${need("moment-" + m.id, "group", m.items.map(([t, k, o], i, l) => ({ t, k, o, x: (i - (l.length - 1) / 2) * 1.25, z: i % 2 ? .3 : 0 })), {}, 1800, 1500, 7)}" alt="${m.t}" loading="lazy"></div>
    <div class="moment__copy"><h3>${m.t}</h3><p>${m.d}</p></div>
  </article>`).join("");

// Store shelf (like the in-store display)
const SHELF = [["sip", ["coral", "butter", "slate", "wine", "cobalt"]], ["grippii", ["taupe", "tangerine", "aqua", "blush"]]];
$("#shelf").innerHTML = SHELF.map(([t, ks]) =>
  `<div class="shelf__row">${ks.map(k => render(t, k)).join("")}</div>`).join("");

/* ---------- Live 3D viewer (loads Three.js on first use) ---------- */
let viewerLoad = null;
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
function openViewer(pr, state) {
  viewerLoad = viewerLoad || Promise.resolve()
    .then(() => window.THREE || loadScript("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"))
    .then(() => window.PuffModels || loadScript("3d/models.js"))
    .then(() => window.PuffViewer || loadScript("3d/viewer.js"));
  $("#viewer").hidden = false; document.body.style.overflow = "hidden";
  viewerLoad.then(() => PuffViewer.open({
    name: pr.name, type: pr.type, current: state.color, opts: { sleeve: state.sleeve },
    colors: pr.colors.map(k => ({ key: k, name: colorOf(k).name, hex: colorOf(k).hex })),
  })).catch(() => { $("#viewerStatus").textContent = "3D viewer couldn't load. Check your connection."; });
}
function closeViewer() { $("#viewer").hidden = true; document.body.style.overflow = ""; if (window.PuffViewer) PuffViewer.close(); }
$("#viewerClose").addEventListener("click", closeViewer);
$("#viewer").addEventListener("click", e => { if (e.target.id === "viewer") closeViewer(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#viewer").hidden) closeViewer(); });

window.neededRenders = () => [...NEEDED.values()];

/* ---------- Bag + toast ---------- */
let bag = 0, toastTimer;
function addToBag(label, hex) {
  bag++;
  $("#bagCount").textContent = bag;
  const b = $(".bag"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  toast(`<i style="background:${hex}"></i>Added ${label}`);
}
function toast(html) {
  const t = $("#toast");
  t.innerHTML = html; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
$("#newsForm").addEventListener("submit", e => { e.preventDefault(); e.target.reset(); toast("You're on the list"); });

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

$("#yr").textContent = new Date().getFullYear();
