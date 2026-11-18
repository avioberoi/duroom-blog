(() => {
  const script = [...document.scripts].find((s) => s.src.endsWith("/round-anim-v2.js"));
  if (!script) return;
  const base = new URL(".", script.src);
  const FIGS = [["fig-cmaes-round", "a"], ["fig-second-loop-round", "b"]].map(([id, kind]) => [document.querySelector(`#${id} > figure`) || document.querySelector(`#${id}`), kind]).filter(([f]) => f);
  if (!FIGS.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const HOLD = 2200;
  const NS = "http://www.w3.org/2000/svg";
  const S = 100;
  const css = `
.round-anim { font: 15px/1.45 var(--serif); color: var(--ink); text-align: left; margin: 0 0 .4rem; }
.round-anim .ra-name { margin: 0; font-size: 1.05em; }
.round-anim .ra-drawn { margin: 0 0 .3rem; color: var(--accent); font-size: .92em; }
.round-anim svg { display: block; width: 100%; height: auto; overflow: visible; }
.round-anim svg text { font: 19px var(--serif); fill: var(--mute); paint-order: stroke; stroke: var(--paper); stroke-width: 7px; stroke-linejoin: round; }
.round-anim .ra-e { fill: none; stroke: var(--mute); stroke-width: 1.4px; vector-effect: non-scaling-stroke; transition: stroke .9s ease, opacity .9s ease; }
.round-anim .ra-old.faint .ra-e { stroke: var(--hair); }
.round-anim .ra-new { transition: transform .9s ease, opacity .6s ease; }
.round-anim .ra-new .ra-e { stroke: var(--accent); stroke-width: 1.8px; }
.round-anim .ra-p { fill: var(--ink); stroke: var(--ink); stroke-width: 1.2px; transition: fill .7s ease, stroke .7s ease, opacity .7s ease; }
.round-anim .ra-p.hollow { fill: var(--paper); stroke: var(--mute); }
.round-anim .ra-p.faint { fill: var(--mute); stroke: var(--mute); }
.round-anim .ra-tick { stroke: var(--ink); stroke-width: 1.3px; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset .9s ease, stroke .7s ease; }
.round-anim .ra-tick.on { stroke-dashoffset: 0; }
.round-anim .ra-tick.over { stroke: var(--mute); }
.round-anim .ra-r { fill: var(--mute); transition: fill .7s ease, opacity .7s ease, r .7s ease; }
.round-anim .ra-r.best { fill: var(--accent); }
.round-anim .ra-c line { stroke: var(--ink); stroke-width: 3px; }
.round-anim .ra-c { transition: transform .9s ease; }
.round-anim .ra-c.moved line { stroke: var(--accent); }
.round-anim .ra-ghost line { stroke: var(--mute); stroke-width: 2.4px; }
.round-anim .ra-own circle { fill: none; stroke: var(--mute); stroke-width: 1.6px; }
.round-anim .ra-own line { stroke: var(--mute); stroke-width: 2px; }
.round-anim .ra-arrow { stroke: var(--accent); stroke-width: 2px; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset .9s ease; }
.round-anim .ra-arrow.on { stroke-dashoffset: 0; }
.round-anim .ra-hint line { stroke: var(--mute); stroke-width: 1.4px; }
.round-anim .ra-fade { transition: opacity .7s ease; }
.round-anim .off { opacity: 0; }
.round-anim .ra-text { min-height: 4.4em; margin: .35rem 0 .2rem; }
.round-anim .ra-text .dot { display: inline-block; width: .5em; height: .5em; border-radius: 50%; background: var(--accent); margin-right: .45em; vertical-align: .1em; }
.round-anim .ra-controls { display: flex; flex-wrap: wrap; align-items: center; gap: .3rem 1.2rem; border-top: 1px solid var(--hair); padding-top: .5rem; }
.round-anim button { font: inherit; color: var(--accent); background: transparent; border: 0; padding: .35rem 0; cursor: pointer; min-width: 4.2em; text-align: left; }
.round-anim button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.round-anim .ra-step { color: var(--mute); font-variant-numeric: tabular-nums; }
@media (max-width: 600px) { .round-anim svg text { font-size: 30px; } .round-anim .ra-text { min-height: 6.2em; } }
/* on a wide page the drawing sits left and the step text and controls beside it, so the moving drawing and its words are on
   one screen (at 1396 x 660 the stacked form was taller than the window) */
.round-anim { container-type: inline-size; }
@container (min-width: 44rem) {
  .round-anim .ra-body { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(13rem, 1fr); column-gap: clamp(1.5rem, 3cqw, 3rem); align-items: center; }
  .round-anim .ra-body { align-items: start; }
  .round-anim .ra-body svg { grid-column: 1; grid-row: 1 / span 3; align-self: center; }
  .round-anim .ra-body .ra-text { grid-column: 2; grid-row: 1; min-height: 5.8em; margin-top: 0; }
  .round-anim .ra-body .ra-controls { grid-column: 2; grid-row: 2; }
  .round-anim .ra-body > figcaption { grid-column: 2; grid-row: 3; margin: .9rem 0 0; max-width: none; }
  .round-anim svg text { font-size: 24px; }
}
.round-anim.ra-init * { transition: none !important; }
@media (prefers-reduced-motion: reduce) { .round-anim * { transition: none !important; } }
@media print { .round-anim { display: none !important; } .round-anim-still { display: block !important; } }`;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.append(st);
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.append(e);
    return e;
  };
  const X = (p) => p[0] * S, Y = (p) => -p[1] * S;
  const at = (g, p, sx, sy) => {
    g.style.transform = `translate(${X(p).toFixed(1)}px, ${Y(p).toFixed(1)}px)` + (sx ? ` scale(${(sx * S).toFixed(2)}, ${(sy * S).toFixed(2)})` : "");
  };
  const cls = (e, c, on) => e.classList.toggle(c, !!on);
  const TEXT = {
    a: [
      ["The centre and its spread. CMA-ES keeps one spread per coordinate, so the cloud is wider along one of them.", 0],
      ["It samples 32 requests around the centre.", 0],
      ["It ranks them by score: the better 16 stay filled, the other 16 turn hollow.", 0],
      ["The centre moves to the weighted middle of the better 16.", 0],
      ["The spread is reshaped from the better 16 for the next round, here a little larger overall.", 0]
    ],
    b: [
      ["The centre and its spread, as in CMA-ES.", 0],
      ["32 requests are drawn around the centre.", 0],
      ["Each request is painted and read back in CLIP; the tick runs from the request to its reading.", 1],
      ["Requests whose picture is not faithful turn hollow. CMA-ES is told a value a little worse than the middle of the round for them; they never set the centre.", 1],
      ["The readings of the four best feasible pictures turn red.", 1],
      ["The next centre is the middle of those four readings, where the decoder did paint. CMA-ES’s own centre, the grey mark, is not used.", 1],
      ["CMA-ES’s update, from the better 16 of the 32, sets only the spread: the new spread is drawn round the new centre.", 1]
    ]
  };
  function build(figure, kind, d) {
    const [x0, x1, y0, y1] = d.lim;
    const host = document.createElement("div");
    host.className = "round-anim";
    const name = kind === "a" ? "One round of CMA-ES" : "One round of DuROOM search";
    host.innerHTML = `<p class="ra-name">${name}</p><p class="ra-drawn">An illustration: drawn, not measured positions.</p>`;
    const svg = el("svg", {
      viewBox: `${x0 * S} ${-y1 * S} ${(x1 - x0) * S} ${(y1 - y0) * S}`,
      role: "img",
      "aria-label": `${name}, animated step by step. An illustration: drawn, not measured positions.`
    });
    host.append(svg);
    const B = kind === "b" ? d.b : null;
    const m1 = kind === "a" ? d.a.m1 : B.m1, sig1 = kind === "a" ? d.a.sig1 : B.sig1;
    const better = new Set(kind === "a" ? d.a.better16 : B.better16);
    const ell = (g, rx, ry) => [1, 2].forEach((k2) => el("ellipse", { class: "ra-e", cx: 0, cy: 0, rx: k2 * rx, ry: k2 * ry }, g));
    const old = el("g", { class: "ra-old" }, svg);
    old.style.transform = `translate(${X(d.m0)}px, ${Y(d.m0)}px)`;
    ell(old, d.sig0[0] * S, d.sig0[1] * S);
    const neu = el("g", { class: "ra-new off" }, svg);
    ell(neu, 1, 1);
    const hint = el("g", { class: "ra-hint ra-fade off" }, svg);
    const ha = [x1 - 2.1, y0 + 0.45], hb = [ha[0] + d.score_dir[0] * 0.9, ha[1] + d.score_dir[1] * 0.9];
    el("line", { x1: X(ha), y1: Y(ha), x2: X(hb), y2: Y(hb) }, hint);
    const hv = [hb[0] - ha[0], hb[1] - ha[1]], hn = Math.hypot(...hv), u = hv.map((v) => v / hn), w = [-u[1], u[0]], h = 0.16;
    el("polygon", { points: [
      hb,
      [hb[0] - h * u[0] + 0.5 * h * w[0], hb[1] - h * u[1] + 0.5 * h * w[1]],
      [hb[0] - h * u[0] - 0.5 * h * w[0], hb[1] - h * u[1] - 0.5 * h * w[1]]
    ].map((p) => `${X(p)},${Y(p)}`).join(" "), fill: "var(--mute)" }, hint);
    el("text", { x: X(ha) - 8, y: Y(ha) + 6, "text-anchor": "end" }, hint).textContent = "score rises";
    const ticks = [], reads = [];
    if (B) d.requests.forEach((p, i) => {
      ticks.push(el("line", { class: "ra-tick", x1: X(p), y1: Y(p), x2: X(B.readings[i]), y2: Y(B.readings[i]), pathLength: 1 }, svg));
      reads.push(el("circle", { class: "ra-r off", cx: X(B.readings[i]), cy: Y(B.readings[i]), r: 4 }, svg));
    });
    const pts = d.requests.map((p) => el("circle", { class: "ra-p off", cx: X(p), cy: Y(p), r: 6 }, svg));
    const plus = (g, s) => {
      el("line", { x1: -s, y1: 0, x2: s, y2: 0 }, g);
      el("line", { x1: 0, y1: -s, x2: 0, y2: s }, g);
    };
    const ghost = el("g", { class: "ra-ghost ra-fade off" }, svg);
    plus(ghost, 11);
    ghost.setAttribute("transform", `translate(${X(d.m0)} ${Y(d.m0)})`);
    const arrow = el("line", { class: "ra-arrow", x1: X(d.m0), y1: Y(d.m0), x2: X(m1), y2: Y(m1), pathLength: 1 }, svg);
    let own = null;
    if (B) {
      own = el("g", { class: "ra-own ra-fade off" }, svg);
      const g = el("g", { transform: `translate(${X(B.cma_own)} ${Y(B.cma_own)})` }, own);
      el("circle", { r: 11 }, g);
      plus(g, 9);
      const lp = [B.cma_own[0] - 0.6, y0 + 0.2];
      el("line", { x1: X(B.cma_own), y1: Y(B.cma_own) + 14, x2: X(B.cma_own), y2: Y(lp) - 26, stroke: "var(--mute)", "stroke-width": 1 }, own);
      el("text", { x: X(B.cma_own), y: Y(lp), "text-anchor": "middle" }, own).textContent = "CMA-ES’s own centre, not used";
    }
    const ctr = el("g", { class: "ra-c" }, svg);
    plus(ctr, 14);
    const text = document.createElement("p");
    text.className = "ra-text";
    text.setAttribute("aria-live", "polite");
    host.append(text);
    const bar = document.createElement("div");
    bar.className = "ra-controls";
    bar.innerHTML = '<button type="button" class="ra-play" aria-pressed="false">Play</button><span class="ra-step"></span>';
    host.append(bar);
    const body = document.createElement("div");
    body.className = "ra-body";
    body.append(svg, text, bar);
    host.append(body);
    const cap = figure.querySelector(":scope > figcaption");
    if (cap) {
      const home = [cap.parentNode, cap.nextSibling];
      const into = () => body.append(cap), back = () => home[0].insertBefore(cap, home[1]);
      into();
      addEventListener("beforeprint", back);
      addEventListener("afterprint", into);
    }
    const play = bar.querySelector(".ra-play"), step = bar.querySelector(".ra-step");
    const N = TEXT[kind].length;
    function apply(k2) {
      const A = kind === "a";
      const sAppear = 2, sRank = A ? 3 : 4, sMove = A ? 4 : 6, sSpread = A ? 5 : 7;
      pts.forEach((c, i) => {
        cls(c, "off", k2 < sAppear);
        const over = B && !B.feasible[i];
        cls(c, "hollow", A ? k2 >= sRank && !better.has(i) : k2 >= sRank && over);
        cls(c, "faint", A ? k2 >= sMove && better.has(i) : k2 >= sMove && !over);
      });
      if (B) {
        ticks.forEach((t2, i) => {
          cls(t2, "on", k2 >= 3);
          cls(t2, "over", k2 >= 4 && !B.feasible[i]);
        });
        reads.forEach((r, i) => {
          cls(r, "off", k2 < 3);
          const best = k2 >= 5 && B.best4.includes(i);
          cls(r, "best", best);
          r.setAttribute("r", best ? 7 : 4);
        });
        cls(own, "off", k2 < sMove);
      }
      cls(hint, "off", k2 !== (A ? 3 : 5));
      cls(old, "faint", k2 >= sRank);
      cls(ghost, "off", k2 < sMove);
      cls(arrow, "on", k2 >= sMove);
      at(ctr, k2 >= sMove ? m1 : d.m0);
      cls(ctr, "moved", k2 >= sMove);
      at(neu, k2 >= sMove ? m1 : d.m0, k2 >= sSpread ? sig1[0] : d.sig0[0], k2 >= sSpread ? sig1[1] : d.sig0[1]);
      cls(neu, "off", k2 < sSpread);
      const [t, mark] = TEXT[kind][k2 - 1];
      text.innerHTML = (mark ? '<span class="dot" aria-hidden="true"></span>' : "") + t;
      step.textContent = `Step ${k2} of ${N}`;
    }
    let k = 1, timer = null, held = false, inView = false;
    const label = (on) => {
      play.textContent = on ? "Pause" : "Play";
      play.setAttribute("aria-pressed", String(on));
    };
    const stop = () => {
      clearTimeout(timer);
      timer = null;
      label(false);
    };
    const next = () => {
      timer = setTimeout(() => {
        k = k >= N ? 1 : k + 1;
        apply(k);
        next();
      }, k >= N ? 2 * HOLD : HOLD);
    };
    const start = () => {
      if (timer) return;
      label(true);
      next();
    };
    play.onclick = () => {
      if (timer) {
        held = true;
        stop();
      } else {
        held = false;
        start();
      }
    };
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => {
      inView = es[0].isIntersecting;
      if (inView && !held) start();
      else if (!inView && timer) stop();
    }, { threshold: 0.4 }).observe(host);
    else start();
    const still = figure.querySelector("picture") || figure.querySelector("img");
    still.classList.add("round-anim-still");
    still.before(host);
    still.style.display = "none";
    host.classList.add("ra-init");
    apply(1);
    requestAnimationFrame(() => requestAnimationFrame(() => host.classList.remove("ra-init")));
    host.dataset.ready = "true";
  }
  fetch(new URL("data/search_round_anim.json", base)).then((r) => {
    if (!r.ok) throw new Error("round animation data unavailable");
    return r.json();
  }).then((d) => FIGS.forEach(([f, kind]) => build(f, kind, d))).catch((e) => console.warn("Using the static round figures", e));
})();
