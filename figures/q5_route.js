(() => {
  const script = [...document.scripts].find((s) => s.src.endsWith("/q5_route.js"));
  if (!script) return;
  const base = new URL(".", script.src);
  const figure = document.querySelector("#fig-q5-route > figure");
  if (!figure) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const num = (n) => Math.round(n).toLocaleString("en-US");
  const NS = "http://www.w3.org/2000/svg";
  (async () => {
    const r = await fetch(new URL("data/q5_route.json", base));
    if (!r.ok) throw new Error("q5_route data unavailable");
    const d = await r.json();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("q5_route.css", base);
    document.head.append(css);
    const L = d.length, S = 1400, Y0 = 430, HALF = 0.0238 * S;
    const cx = d.centres.map((c) => c.progress), cyv = d.centres.map((c) => c.offset * S);
    const interp = (x, xs, ys) => {
      if (x <= xs[0]) return ys[0];
      for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[ys.length - 1];
    };
    const X = (p) => p * L * S;
    const pathY = (p) => Y0 - interp(p, cx, cyv);
    const half = (n) => HALF * n / d.max_count;
    function band(route) {
      const st = d[route], ps = [], N = 400;
      for (let i = 0; i <= N; i++) ps.push(i / N);
      const xs = ps.map(X);
      const ys = route === "path" ? ps.map((p) => interp(p, cx, cyv)) : ps.map(() => 0);
      const cs = ps.map((p) => interp(p, st.map((s) => s.progress), st.map((s) => s.count)));
      const nx = [], ny = [];
      for (let i = 0; i <= N; i++) {
        if (route === "path") {
          let dx = 0, dy = 0, k = 0;
          for (let j = Math.max(0, i - 4); j <= Math.min(N, i + 4); j++) {
            const a = Math.max(0, j - 1), b = Math.min(N, j + 1);
            dx += (xs[b] - xs[a]) / (b - a);
            dy += (ys[b] - ys[a]) / (b - a);
            k++;
          }
          const m = Math.hypot(dx, dy);
          nx.push(-dy / m);
          ny.push(dx / m);
        } else {
          nx.push(0);
          ny.push(1);
        }
      }
      const pt = (i, sgn) => `${(xs[i] + sgn * half(cs[i]) * nx[i]).toFixed(1)},${(Y0 - (ys[i] + sgn * half(cs[i]) * ny[i])).toFixed(1)}`;
      let up = "", down = "";
      for (let i = 0; i <= N; i++) up += (i ? "L" : "M") + pt(i, 1);
      for (let i = N; i >= 0; i--) down += "L" + pt(i, -1);
      return up + down + "Z";
    }
    const pathLine = d.centres.map((c, i) => `${i ? "L" : "M"}${X(c.progress).toFixed(1)},${(Y0 - c.offset * S).toFixed(1)}`).join("");
    const stationDots = (route, y) => d[route].map((s) => `<circle class="q5r-tick ${route}" cx="${X(s.progress).toFixed(1)}" cy="${y(s.progress).toFixed(1)}" r="2.6"/>`).join("");
    const decades = d.centres.slice(1, -1).map((c) => `<circle class="q5r-centre" cx="${X(c.progress).toFixed(1)}" cy="${(Y0 - c.offset * S).toFixed(1)}" r="6"/><text class="q5r-dlabel" x="${X(c.progress).toFixed(1)}" y="${(Y0 - c.offset * S - 16).toFixed(1)}" text-anchor="middle">${esc(c.label)}</text>`).join("");
    const x1 = X(1);
    const host = document.createElement("div");
    host.className = "work-explorer q5-route-demo";
    host.innerHTML = `
      <svg viewBox="-60 0 ${(x1 + 120).toFixed(0)} ${Y0 + 120}" role="img" aria-label="Side view of the straight walk and the decade path; two dots move together, one on each route.">
        <path class="q5r-band" d="${band("path")}"/><path class="q5r-band" d="${band("straight")}"/>
        <path class="q5r-path" d="${pathLine}"/>
        <line class="q5r-straight" x1="0" y1="${Y0}" x2="${x1.toFixed(1)}" y2="${Y0}"/>
        ${stationDots("path", pathY)}${stationDots("straight", () => Y0)}${decades}
        <circle class="q5r-end" cx="0" cy="${Y0}" r="5"/><circle class="q5r-end" cx="${x1.toFixed(1)}" cy="${Y0}" r="5"/>
        <text class="q5r-endlabel" x="-30" y="${Y0 + 84}">Before ${d.cutoff}</text>
        <text class="q5r-endlabel" x="${(x1 + 30).toFixed(1)}" y="${Y0 + 84}" text-anchor="end">${d.window[0]}–${d.window[1]}</text>
        <line class="q5r-link" id="q5r-link" x1="0" y1="${Y0}" x2="0" y2="${Y0}"/>
        <g class="q5r-dot q5r-dot-straight" id="q5r-ds"><circle r="9"/><text class="q5r-count" y="40" text-anchor="middle"></text></g>
        <g class="q5r-dot q5r-dot-path" id="q5r-dp"><circle r="9"/><text class="q5r-count" x="-22" y="40" text-anchor="end"></text></g>
      </svg>
      <p class="q5r-key"><span><i class="straight"></i>Straight walk, ${L.toFixed(3)} long</span><span><i class="path"></i>Decade path</span><span><i class="band"></i>Band width: works within reach</span></p>
      <div class="q5r-controls">
        <button type="button" class="q5r-play" aria-pressed="false">Play</button>
        <label class="q5r-slider">Position along the route <input type="range" min="0" max="${d.path.length - 1}" step="1" value="2"></label>
      </div>
      <div class="q5r-cards"></div>
      <p class="q5r-note">${esc(d.definition)} ${esc(d.drawing)} ${esc(d.artworks)}</p>`;
    const svg = host.querySelector("svg"), ds = host.querySelector("#q5r-ds"), dp = host.querySelector("#q5r-dp"), link = host.querySelector("#q5r-link");
    const cards = host.querySelector(".q5r-cards"), slider = host.querySelector("input"), play = host.querySelector(".q5r-play");
    const move = (g, x, y) => {
      g.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    const nearest = (p) => d.straight.reduce((a, s) => Math.abs(s.progress - p) < Math.abs(a.progress - p) ? s : a);
    const pct = (p) => Math.round(100 * p);
    const where = (s) => s.label === "between" ? `between the ${s.between[0] === "start" ? "start" : s.between[0]} and ${s.between[1] === "end" ? "end" : s.between[1]} centres` : s.label === "start" ? "start" : s.label === "end" ? "end" : `${s.label} centre`;
    const card = (cls, route, s, extra) => {
      const w = d.works[s.work];
      return `<figure class="q5r-card ${cls}"><img src="${new URL(w.asset, base)}" alt="${esc(w.title)}, ${esc(w.artist)}${w.year ? ", " + w.year : ""}" width="320" height="240">
        <figcaption><span class="q5r-route">${route} · ${pct(s.progress)}% of the way</span>
        <span class="q5r-n">${num(s.count)} works within reach</span>${extra ? `<span class="q5r-where">${extra}</span>` : ""}
        <span class="q5r-artist">${esc(w.artist)}</span><span class="q5r-title">${esc(w.title)}</span>
        <span class="q5r-year">${w.year ?? "Date unknown"}</span></figcaption></figure>`;
    };
    let index = 2;
    function show(i, announce) {
      index = i;
      slider.value = i;
      const p = d.path[i], s = nearest(p.progress);
      move(dp, X(p.progress), pathY(p.progress));
      move(ds, X(s.progress), Y0);
      link.setAttribute("x1", X(p.progress).toFixed(1));
      link.setAttribute("x2", X(s.progress).toFixed(1));
      link.setAttribute("y1", pathY(p.progress).toFixed(1));
      link.setAttribute("y2", Y0);
      dp.querySelector("text").textContent = num(p.count);
      ds.querySelector("text").textContent = num(s.count);
      cards.innerHTML = card("straight", "Straight walk", s, "") + card("path", "Decade path", p, where(p));
      slider.setAttribute("aria-valuetext", `${pct(p.progress)} percent of the way, ${where(p)}: straight walk ${num(s.count)} works within reach, decade path ${num(p.count)}`);
      cards.setAttribute("aria-live", announce ? "polite" : "off");
    }
    let timer = null;
    const stop = () => {
      clearInterval(timer);
      timer = null;
      play.textContent = "Play";
      play.setAttribute("aria-pressed", "false");
    };
    const start = () => {
      if (index >= d.path.length - 1) show(0, false);
      play.textContent = "Pause";
      play.setAttribute("aria-pressed", "true");
      timer = setInterval(() => {
        if (index >= d.path.length - 1) stop();
        else show(index + 1, false);
      }, 1300);
    };
    play.onclick = () => timer ? stop() : start();
    slider.oninput = () => {
      if (timer) stop();
      show(Number(slider.value), true);
    };
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => {
      if (!es[0].isIntersecting && timer) stop();
    }).observe(host);
    d.works.forEach((w) => {
      const im = new Image();
      im.src = new URL(w.asset, base);
    });
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    fallback.classList.add("work-fallback");
    fallback.before(host);
    fallback.style.display = "none";
    host.classList.add("q5r-still");
    show(2, false);
    requestAnimationFrame(() => requestAnimationFrame(() => host.classList.remove("q5r-still")));
    host.dataset.ready = "true";
  })().catch((e) => console.warn("Using static q5_route figure", e));
})();
