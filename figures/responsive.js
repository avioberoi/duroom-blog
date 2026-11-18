for (const image of document.querySelectorAll(".quarto-figure img")) {
  const mobile = image.dataset.mobileSrc || image.closest("[data-mobile-src]")?.dataset.mobileSrc;
  if (!mobile || image.parentElement.tagName === "PICTURE") continue;
  const picture = document.createElement("picture");
  const source = document.createElement("source");
  source.media = "(max-width: 600px)";
  source.srcset = mobile;
  image.before(picture);
  picture.append(source, image);
}
const pinPairs = [...document.querySelectorAll(".visual-pair-pin")];
let pinFrame;
function updatePins() {
  cancelAnimationFrame(pinFrame);
  pinFrame = requestAnimationFrame(() => {
    for (const pair of pinPairs) {
      const copy = pair.querySelector(":scope > .visual-copy");
      const stack = pair.classList.contains("vp") ? [...pair.querySelectorAll(":scope > .visual-copy, :scope > .visual-side")].map((e) => e.getBoundingClientRect()) : [];
      const stackHeight = stack.length ? Math.max(...stack.map((r) => r.bottom)) - Math.min(...stack.map((r) => r.top)) : copy ? copy.getBoundingClientRect().height : 0;
      for (const figure of pair.querySelectorAll(":scope > .quarto-figure")) {
        const height = figure.getBoundingClientRect().height;
        const fits = innerWidth >= 1200 && height <= innerHeight - 32 && stackHeight > height + 32;
        figure.classList.toggle("pin-ready", Boolean(fits));
      }
    }
  });
}
if (pinPairs.length) {
  const observer = new ResizeObserver(updatePins);
  pinPairs.forEach((pair) => [...pair.children].forEach((child) => observer.observe(child)));
  addEventListener("resize", updatePins);
  document.fonts.ready.then(updatePins);
  updatePins();
}
function revealFigureTarget() {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target) return;
  let parent = target.parentElement;
  while (parent) {
    if (parent.tagName === "DETAILS") parent.open = true;
    parent = parent.parentElement;
  }
}
addEventListener("hashchange", revealFigureTarget);
revealFigureTarget();
(() => {
  const GAP = 180;
  const blocks = [...document.querySelectorAll(".visual-pair, .vp.vp-side")].filter((b) => !b.matches(".visual-pair-split, .visual-pair-stack, .visual-wide, .vp-flip, .vp-flipfill") && b.querySelector(":scope > .visual-copy") && b.querySelector(":scope > .quarto-figure") && !b.querySelector(":scope > .visual-side") && b.querySelectorAll(":scope > .quarto-figure").length === 1);
  if (!blocks.length) return;
  if (getComputedStyle(document.body).getPropertyValue("--intro-balance").trim() === "1") return;
  const STACK = 160;
  const unwrap = (b) => {
    if (b.classList.contains("lay-stack")) {
      b.classList.remove("lay-stack");
      b.style.removeProperty("--stack-w");
    }
    if (!b.classList.contains("lay-wrap")) return;
    b.querySelector(":scope > .visual-copy").after(b.querySelector(":scope > .quarto-figure"));
    b.classList.remove("lay-wrap");
    b.style.removeProperty("--wrap-w");
  };
  let frame;
  function measure() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      blocks.forEach(unwrap);
      if (innerWidth < 1200 || matchMedia("print").matches) return;
      const wrap = [], stack = [];
      for (const b of blocks) {
        const fig = b.querySelector(":scope > .quarto-figure"), f = fig.getBoundingClientRect();
        const c = b.querySelector(":scope > .visual-copy").getBoundingClientRect();
        const left = [...b.children].filter((e) => e !== fig).map((e) => e.getBoundingClientRect()).filter((r) => r.height && r.right <= f.left + 4);
        const textBottom = left.length ? Math.max(...left.map((r) => r.bottom)) : c.bottom;
        const beside = f.left >= c.right - 4 && f.top < c.bottom;
        if (beside && textBottom - f.bottom > GAP) wrap.push([b, f.width]);
        else if (beside && b.classList.contains("visual-pair") && f.bottom - textBottom > STACK) stack.push([b, f.width]);
      }
      for (const [b, w] of wrap) {
        b.style.setProperty("--wrap-w", `${Math.round(w)}px`);
        b.querySelector(":scope > .visual-copy").before(b.querySelector(":scope > .quarto-figure"));
        b.classList.add("lay-wrap");
      }
      for (const [b, w] of stack) {
        b.style.setProperty("--stack-w", `${Math.round(w)}px`);
        b.classList.add("lay-stack");
      }
    });
  }
  addEventListener("load", () => [500, 1500, 3500].forEach((t) => setTimeout(measure, t)));
  let timer;
  addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(measure, 150);
  });
  addEventListener("beforeprint", () => blocks.forEach(unwrap));
  addEventListener("afterprint", measure);
  document.fonts.ready.then(measure);
  addEventListener("load", measure);
  measure();
})();
(() => {
  if (getComputedStyle(document.body).getPropertyValue("--intro-balance").trim() !== "1") return;
  const TOL = 60;
  const pairs = [...document.querySelectorAll("#quarto-document-content > .visual-pair")].filter((b) => b.querySelector(":scope > .visual-copy") && b.querySelectorAll(":scope > .quarto-figure").length === 1 && b.querySelector(":scope > .quarto-figure figure"));
  if (!pairs.length) return;
  const home = new Map(pairs.map((b) => {
    const copy = b.querySelector(":scope > .visual-copy");
    return [b, { copy, units: [...copy.children] }];
  }));
  const runs = [];
  const LAY = ["lay-tw", "lay-mc", "lay-full", "lay-cols"];
  function restoreAll() {
    for (const b of pairs) {
      const { copy, units } = home.get(b);
      copy.append(...units);
      b.classList.remove(...LAY);
      b.style.removeProperty("--tw");
    }
    for (const r of runs) r.remove();
    runs.length = 0;
  }
  const parts = (b) => {
    const fig = b.querySelector(":scope > .quarto-figure");
    const cap = fig.querySelector(":scope > figure > figcaption");
    const pic = [...fig.querySelectorAll(":scope > figure > *")].find((k) => k.tagName !== "FIGCAPTION");
    const img = pic && (pic.querySelector("img") || pic.querySelector("svg, canvas") || pic);
    return { fig, cap, img };
  };
  function measureAt(b, w) {
    b.classList.add("lay-tw");
    b.style.setProperty("--tw", `${w}px`);
    const { units } = home.get(b), { fig, cap, img } = parts(b);
    const hs = units.map((u) => u.getBoundingClientRect().height);
    const gap = parseFloat(getComputedStyle(units[0]).marginBottom) || 17;
    const figH = fig.getBoundingClientRect().height, imgH = img.getBoundingClientRect().height;
    let capMC = 0;
    if (cap) {
      b.classList.add("lay-mc");
      capMC = cap.getBoundingClientRect().height + (parseFloat(getComputedStyle(cap).marginTop) || 0);
      b.classList.remove("lay-mc");
    }
    return { w, hs, gap, figH, imgH, capMC };
  }
  const MINSCALE = 0.8;
  function solve(b) {
    const W = b.getBoundingClientRect().width, { img } = parts(b);
    const nat = img && img.naturalWidth ? img.naturalWidth : 0;
    const gap = parseFloat(getComputedStyle(b).columnGap) || 48;
    let widths = [0.36, 0.43, 0.5, 0.55].map((f) => Math.round(Math.min(640, Math.max(340, f * W))));
    if (nat) {
      const wmax = Math.floor(W - gap - MINSCALE * nat);
      if (wmax >= 340) widths.push(Math.min(640, wmax));
      const ok = widths.filter((w) => W - gap - w >= MINSCALE * nat - 1);
      if (ok.length) widths = ok;
    }
    widths = [...new Set(widths)];
    let best = null;
    for (const w of widths) {
      const m = measureAt(b, w), n = m.hs.length;
      for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
        let t = m.gap * (j - i);
        for (let k = i; k <= j; k++) t += m.hs[k];
        const pen = 25 * ((i > 0) + (j < n - 1)) + (i > 0 && j < n - 1 ? 60 : 0) + 0.15 * Math.abs(w - 0.43 * W);
        for (const mode of m.capMC ? ["default", "mc"] : ["default"]) {
          const d = (mode === "mc" ? t + m.capMC : t) - (mode === "mc" ? m.imgH : m.figH);
          const score = Math.abs(d) + pen;
          if (!best || score < best.score) best = { w, i, j, n, mode, d, score };
        }
      }
    }
    b.classList.remove("lay-tw");
    b.style.removeProperty("--tw");
    if (best && nat) best.small = W - gap - best.w < MINSCALE * nat - 1;
    return best;
  }
  function run(us) {
    const r = document.createElement("div");
    r.className = "vp-run lay-run";
    r.append(...us);
    runs.push(r);
    return r;
  }
  function apply(b, s) {
    const { units } = home.get(b);
    if (Math.abs(s.d) > TOL || s.small) {
      const { img } = parts(b), W = b.getBoundingClientRect().width;
      const box = img.getBoundingClientRect();
      const r = img.naturalWidth ? img.naturalHeight / img.naturalWidth : box.height / box.width;
      const scale = img.naturalWidth ? W / img.naturalWidth : 1;
      if (scale <= 1.5 && r * W <= 0.9 * innerHeight) {
        b.classList.add("lay-full");
        if (units.reduce((a, u) => a + u.textContent.trim().length, 0) > 350) b.classList.add("lay-cols");
        return `full d${Math.round(s.d)}`;
      }
    }
    b.classList.add("lay-tw");
    b.style.setProperty("--tw", `${s.w}px`);
    if (s.mode === "mc") b.classList.add("lay-mc");
    if (s.i > 0) b.before(run(units.slice(0, s.i)));
    if (s.j < s.n - 1) b.after(run(units.slice(s.j + 1)));
    return `${s.mode} w${s.w} p${s.i}-${s.j}/${s.n} d${Math.round(s.d)}`;
  }
  let frame, firstDone = false, userScrolled = false;
  addEventListener("scroll", () => {
    if (firstDone) userScrolled = true;
  }, { passive: true });
  function layout() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      restoreAll();
      if (innerWidth < 1200 || matchMedia("print").matches) {
        document.body.dataset.balance = "off";
        return;
      }
      const plan = pairs.map((b) => [b, solve(b)]);
      document.body.dataset.balance = plan.map(([b, s]) => apply(b, s)).join(" | ");
      if (!firstDone) {
        firstDone = true;
        const t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (t && !userScrolled) t.scrollIntoView();
      }
    });
  }
  addEventListener("load", () => [300, 1200, 3e3].forEach((t) => setTimeout(layout, t)));
  let timer;
  addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(layout, 150);
  });
  addEventListener("beforeprint", restoreAll);
  addEventListener("afterprint", layout);
  document.fonts.ready.then(layout);
  addEventListener("load", layout);
  layout();
})();
document.querySelectorAll('a[href$="for-avi.html"]').forEach((a) => {
  const box = a.closest(".sidebar-item, li, .nav-page");
  (box || a).remove();
});
(() => {
  const isRef = (n) => n && n.nodeType === 1 && n.matches("a.footnote-ref");
  document.querySelectorAll("#quarto-document-content a.footnote-ref").forEach((a) => {
    let p = a.previousSibling;
    while (p && p.nodeType === 3 && !p.textContent.trim()) p = p.previousSibling;
    if (!isRef(p)) return;
    const s = document.createElement("sup");
    s.className = "fn-sep";
    s.textContent = ",";
    s.setAttribute("aria-hidden", "true");
    a.before(s);
  });
})();
