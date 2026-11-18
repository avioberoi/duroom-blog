(() => {
  const script = [...document.scripts].find((s) => s.src.endsWith("/centre-path-anim.js"));
  if (!script) return;
  const base = new URL(".", script.src);
  const figure = document.querySelector("#fig-centre-path > figure") || document.querySelector("#fig-centre-path");
  if (!figure || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const STEP = 230, NS = "http://www.w3.org/2000/svg", R = 72, S = 5;
  const COL = { V: "var(--accent)", C1: "var(--ink)", C2: "var(--mute)" };
  const css = `
.centre-path { font: 15px/1.45 var(--serif); color: var(--ink); text-align: left; margin: 0 0 .4rem; }
.centre-path .cp-name { margin: 0; font-size: 1.05em; }
.centre-path .cp-sub { margin: 0 0 .3rem; color: var(--mute); font-size: .92em; }
.centre-path svg { display: block; width: 100%; max-width: 560px; height: auto; margin: 0 auto; }
.centre-path svg text { font: 15px var(--serif); fill: var(--mute); paint-order: stroke; stroke: var(--paper); stroke-width: 5px; }
.centre-path .cp-ring { fill: none; stroke: var(--hair); stroke-width: 1; }
.centre-path .cp-trail { fill: none; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
.centre-path .cp-key { display: flex; flex-wrap: wrap; gap: .2rem 1.2rem; margin: .3rem 0; font-size: .92em; }
.centre-path .cp-key i { display: inline-block; width: 1.5em; height: 0; border-top: 2.5px solid; vertical-align: middle; margin-right: .45em; }
.centre-path .cp-read { min-height: 2.9em; margin: .2rem 0; font-variant-numeric: tabular-nums; }
.centre-path .cp-controls { display: flex; flex-wrap: wrap; align-items: center; gap: .3rem 1rem; border-top: 1px solid var(--hair); padding-top: .5rem; }
.centre-path button { font: inherit; color: var(--accent); background: transparent; border: 0; padding: .35rem 0; cursor: pointer; min-width: 4.2em; text-align: left; }
.centre-path .cp-starts button { min-width: 0; padding: .35rem .5rem; color: var(--ink); }
.centre-path .cp-starts button[aria-pressed="true"] { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.centre-path button:focus-visible, .centre-path input:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.centre-path label { display: flex; flex: 1 1 12rem; align-items: center; gap: .6rem; color: var(--mute); }
.centre-path input[type=range] { flex: 1; min-width: 6rem; accent-color: var(--accent); }
@media (max-width: 600px) { .centre-path svg text { font-size: 25px; } }
@media (prefers-reduced-motion: reduce) { .centre-path * { transition: none !important; } }
@media print { .centre-path { display: none !important; } .centre-path-still { display: block !important; } }`;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.append(st);
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.append(e);
    return e;
  };
  fetch(new URL("data/search_centre_path.json", base)).then((r) => {
    if (!r.ok) throw new Error("centre path data unavailable");
    return r.json();
  }).then((d) => {
    const host = document.createElement("div");
    host.className = "centre-path";
    host.innerHTML = `<p class="cp-name">Where the centre went, round by round</p>
        <p class="cp-sub">Measured. Distance from the start is exact; direction is a flat summary that keeps about four fifths of the spread.</p>`;
    const svg = el("svg", {
      viewBox: `${-R * S} ${-R * S} ${2 * R * S} ${2 * R * S}`,
      role: "img",
      "aria-label": "The centre of each loop, round by round, around the starting work; rings every 10 degrees from the start."
    });
    host.append(svg);
    for (let r = 10; r <= 70; r += 10) {
      el("circle", { class: "cp-ring", r: r * S }, svg);
      if (r % 20 === 0) {
        const a = -58 * Math.PI / 180;
        el("text", { x: r * S * Math.cos(a), y: -r * S * Math.sin(a), "text-anchor": "middle" }, svg).textContent = `${r}°`;
      }
    }
    const plus = el("g", {}, svg);
    el("line", { x1: -9, x2: 9, y1: 0, y2: 0, stroke: "var(--ink)", "stroke-width": 2 }, plus);
    el("line", { x1: 0, x2: 0, y1: -9, y2: 9, stroke: "var(--ink)", "stroke-width": 2 }, plus);
    el("text", { x: 12, y: 22 }, svg).textContent = "start";
    const trails = {}, dots = {};
    d.arms.forEach((a) => {
      trails[a.key] = el("polyline", { class: "cp-trail", stroke: COL[a.key] }, svg);
    });
    d.arms.forEach((a) => {
      dots[a.key] = el("circle", { r: 7, fill: COL[a.key], stroke: "var(--paper)", "stroke-width": 2 }, svg);
    });
    const key = document.createElement("p");
    key.className = "cp-key";
    key.innerHTML = d.arms.map((a) => `<span><i style="border-color:${COL[a.key]}"></i>${a.name}</span>`).join("");
    const read = document.createElement("p");
    read.className = "cp-read";
    read.setAttribute("aria-live", "off");
    const bar = document.createElement("div");
    bar.className = "cp-controls";
    const starts = Object.keys(d.starts);
    bar.innerHTML = `<button type="button" class="cp-play" aria-pressed="false">Play</button>
        <span class="cp-starts" role="group" aria-label="Start">Start ${starts.map((s2, i) => `<button type="button" data-s="${s2}" aria-pressed="${i ? "false" : "true"}">${i + 1}</button>`).join("")}</span>
        <label>Round <input type="range" min="0" max="60" step="1" value="0" aria-label="Round"></label>`;
    host.append(key, read, bar);
    const play = bar.querySelector(".cp-play"), slider = bar.querySelector("input");
    let s = starts[0], k = 0, timer = null;
    const P = (p) => `${(p[0] * S).toFixed(1)},${(-p[1] * S).toFixed(1)}`;
    function show(i) {
      k = i;
      slider.value = i;
      const parts = [];
      d.arms.forEach((a) => {
        const path = d.starts[s][a.key];
        trails[a.key].setAttribute("points", path.slice(0, i + 1).map(P).join(" "));
        const p = path[i];
        dots[a.key].setAttribute("cx", (p[0] * S).toFixed(1));
        dots[a.key].setAttribute("cy", (-p[1] * S).toFixed(1));
        parts.push(`${a.name} ${p[2].toFixed(1)}°`);
      });
      read.textContent = `${i === 60 ? "After the last round" : "Round " + i}, angle of the centre from the start: ${parts.join(", ")}.`;
      slider.setAttribute("aria-valuetext", read.textContent);
    }
    const stop = (end) => {
      clearInterval(timer);
      timer = null;
      play.textContent = end ? "Replay" : "Play";
      play.setAttribute("aria-pressed", "false");
    };
    play.onclick = () => {
      if (timer) return stop(false);
      if (k >= 60) show(0);
      play.textContent = "Pause";
      play.setAttribute("aria-pressed", "true");
      timer = setInterval(() => {
        show(k + 1);
        if (k >= 60) stop(true);
      }, STEP);
    };
    slider.oninput = () => {
      if (timer) stop(false);
      show(Number(slider.value));
    };
    bar.querySelectorAll(".cp-starts button").forEach((b) => b.onclick = () => {
      if (timer) stop(false);
      s = b.dataset.s;
      bar.querySelectorAll(".cp-starts button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      play.textContent = "Play";
      show(0);
    });
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => {
      if (!es[0].isIntersecting && timer) stop(false);
    }).observe(host);
    const still = figure.querySelector("picture") || figure.querySelector("img");
    still.classList.add("centre-path-still");
    still.before(host);
    still.style.display = "none";
    show(0);
    host.dataset.ready = "true";
  }).catch((e) => console.warn("Using the static centre path figure", e));
})();
