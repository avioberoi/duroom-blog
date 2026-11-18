(() => {
  const script = [...document.scripts].find((s) => s.src.endsWith("/q3_fan.js"));
  const base = new URL(".", script.src);
  const figure = document.querySelector("#fig-q3-fan > figure");
  if (!figure) return;
  (async () => {
    const r = await fetch(new URL("data/q3_fan.json", base));
    if (!r.ok) throw new Error("q3_fan data unavailable");
    const d = await r.json();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("q3_fan.css", base);
    document.head.append(css);
    await new Promise((res) => {
      css.onload = css.onerror = res;
    });
    const NS = "http://www.w3.org/2000/svg";
    const W = 616, H = 596, R = 380, GAP = 52, S = 56, OX = 46, OY = 526, RT = R + GAP, XPAD = 28;
    const rad = (x) => x * Math.PI / 180;
    const P = (r2, a) => [OX + r2 * Math.cos(rad(a)), OY - r2 * Math.sin(rad(a))];
    const f1 = (x) => x.toFixed(1);
    const pct = (x) => `${(100 * x).toFixed(1)}%`;
    const esc = (s2) => String(s2).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ref = d.reference, works = d.works;
    const arc = (r2, a0, a1) => {
      const [x0, y0] = P(r2, a0), [x1, y1] = P(r2, a1);
      return `M${x0} ${y0}A${r2} ${r2} 0 0 0 ${x1} ${y1}`;
    };
    const host = document.createElement("div");
    host.className = "q3-fan-demo";
    host.innerHTML = `
      <div class="q3fan-controls" role="group" aria-label="Basis the leftover is measured against">
        <button type="button" data-state="0" aria-pressed="true">Whole corpus</button>
        <button type="button" data-state="1" aria-pressed="false">Before 1900</button>
      </div>
      <p class="q3fan-status" aria-live="polite"></p>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Quarter circle: each artwork is a mark at its measured angle, and its leftover share is the square of the sine of that angle. Toggling the basis from the whole corpus to the works before 1900 moves every mark.`)}">
        <path class="q3fan-top" d="M${OX} ${OY}L${P(R, ref.cut.angle)}A${R} ${R} 0 0 0 ${OX} ${OY - R}Z"/>
        <g class="q3fan-ref">
          <line class="q3fan-median" x1="${OX}" y1="${OY}" x2="${P(R, ref.median.angle)[0]}" y2="${P(R, ref.median.angle)[1]}"/>
          <line class="q3fan-cut" x1="${OX}" y1="${OY}" x2="${P(R, ref.cut.angle)[0]}" y2="${P(R, ref.cut.angle)[1]}"/>
        </g>
        <line class="q3fan-axis" x1="${OX}" y1="${OY}" x2="${OX + R + 10}" y2="${OY}"/>
        <line class="q3fan-axis" x1="${OX}" y1="${OY}" x2="${OX}" y2="${OY - R - 10}"/>
        <path class="q3fan-arc" d="${arc(R, 0, 90)}"/>
        <g class="q3fan-tri"></g>
        <text class="q3fan-note" x="${OX + R / 2}" y="${OY + 60}" text-anchor="middle">along the 32 directions</text>
        <text class="q3fan-note" transform="translate(${OX - 12} ${OY - R * 0.5}) rotate(-90)" text-anchor="middle">off the directions</text>
        <g class="q3fan-marks"></g>
      </svg>
      <ul class="q3fan-key" aria-label="Key">
        <li><i class="k-median"></i>median, ${f1(ref.median.angle)}°</li>
        <li><i class="k-cut"></i>top-1% cut, ${f1(ref.cut.angle)}°</li>
        <li><i class="k-top"></i>top 1%</li>
      </ul>
      <details class="q3fan-credit-details"><summary>All six works: credits and both measurements</summary><table class="q3fan-ledger">
        <caption>Artworks (WikiArt reproductions): angle · share left over</caption>
        <thead><tr><th scope="col">Artwork</th><th scope="col" data-col="0">Whole corpus</th><th scope="col" data-col="1">Before 1900</th></tr></thead>
        <tbody></tbody>
      </table></details>
      <p class="q3fan-def">Every work's offset from the average is drawn at length 1. Its leftover share is the square of the dashed leg (sin² θ). Angles are measured; where the offset points inside the 32 directions, and the thumbnail ring, are drawn. The basis from the works before 1900 includes those works and takes its own average.</p>`;
    const svg = host.querySelector("svg");
    const tri = svg.querySelector(".q3fan-tri");
    const marksG = svg.querySelector(".q3fan-marks");
    const status = host.querySelector(".q3fan-status");
    const tbody = host.querySelector("tbody");
    const buttons = [...host.querySelectorAll(".q3fan-controls button")];
    let state = 0, s = 0, selected = works.findIndex((w) => w.short === "Calder"), raf = 0;
    const mk = works.map((w, i) => {
      const k = S / Math.max(w.size[0], w.size[1]), iw = w.size[0] * k, ih = w.size[1] * k;
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "q3fan-mark");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `${w.artist}, ${w.title}, ${w.year}: show its leftover`);
      g.innerHTML = `<line class="q3fan-leader"/><image width="${iw}" height="${ih}" href="${esc(new URL(w.asset, base))}" preserveAspectRatio="none"/><rect class="q3fan-frame" width="${iw}" height="${ih}"/><circle class="q3fan-dot" r="5"/><text class="q3fan-lab"><tspan class="n"></tspan><tspan class="a"></tspan></text>`;
      marksG.append(g);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><button type="button">${esc(w.artist)}, <i>${esc(w.title)}</i>, ${w.year}</button></td><td data-col="0" data-label="Whole corpus"></td><td data-col="1" data-label="Before 1900"></td>`;
      tbody.append(tr);
      const pick = () => {
        selected = i;
        render();
      };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick();
        }
      });
      tr.querySelector("button").addEventListener("click", pick);
      return { w, g, iw, ih, tr, leader: g.querySelector("line"), image: g.querySelector("image"), frame: g.querySelector("rect"), dot: g.querySelector("circle"), lab: g.querySelector("text"), ln: g.querySelector(".n"), la: g.querySelector(".a") };
    });
    mk.forEach((m) => {
      const c = m.tr.querySelectorAll("td");
      c[1].innerHTML = `<span>${f1(m.w.angle)}°</span><span class="sep"> · </span><span>${pct(m.w.share)}</span>`;
      c[2].innerHTML = `<span>${f1(m.w.angle_past)}°</span><span class="sep"> · </span><span>${pct(m.w.share_past)}</span>`;
    });
    const NARROW = "(max-width: 600px)";
    const tlen = (el, fs) => {
      const n = el.getComputedTextLength ? el.getComputedTextLength() : 0;
      return n > 0 ? n : 0.56 * fs * el.textContent.length;
    };
    const hit = (a, b, g) => a[0] < b[2] + g && b[0] < a[2] + g && a[1] < b[3] + g && b[1] < a[3] + g;
    const noteX = svg.querySelector(".q3fan-note");
    function render() {
      const narrow = matchMedia(NARROW).matches, fs = narrow ? 29 : 15.5, pad = narrow ? XPAD : 0;
      svg.setAttribute("viewBox", `0 0 ${W} ${H + pad}`);
      noteX.setAttribute("y", OY + 60 + pad);
      mk.forEach((m, i) => {
        const a2 = lerp(m.w.angle, m.w.angle_past, s), ra = lerp(m.w.ring, m.w.ring_past, s);
        const [dx, dy] = P(R, a2), [tx, ty] = P(RT, ra);
        m.a = a2;
        m.ra = ra;
        m.tx = tx;
        m.ty = ty;
        m.leader.setAttribute("x1", dx);
        m.leader.setAttribute("y1", dy);
        m.leader.setAttribute("x2", tx);
        m.leader.setAttribute("y2", ty);
        m.dot.setAttribute("cx", dx);
        m.dot.setAttribute("cy", dy);
        for (const el of [m.image, m.frame]) {
          el.setAttribute("x", tx - m.iw / 2);
          el.setAttribute("y", ty - m.ih / 2);
        }
        m.g.classList.toggle("is-selected", i === selected);
        m.g.setAttribute("aria-pressed", i === selected);
        m.tr.classList.toggle("is-selected", i === selected);
        if (!narrow) {
          const right = ra < 34, lx = right ? tx + m.iw / 2 + 6 : tx;
          m.lab.setAttribute("y", right ? ty : ty - m.ih / 2 - 6);
          m.lab.setAttribute("text-anchor", right ? "start" : "middle");
          for (const [el, dy2, txt] of [[m.ln, right ? "-.15em" : "-1.15em", m.w.short], [m.la, "1.15em", `${f1(a2)}°`]]) {
            el.setAttribute("x", lx);
            el.setAttribute("dy", dy2);
            el.textContent = txt;
          }
        } else {
          m.la.textContent = "";
          m.ln.textContent = m.w.short;
          m.ln.setAttribute("dy", "0");
        }
      });
      if (narrow) {
        const thumbs = mk.map((m) => [m.tx - m.iw / 2, m.ty - m.ih / 2, m.tx + m.iw / 2, m.ty + m.ih / 2]);
        const spots = (order) => {
          const placed = [], out = [];
          let clear = true;
          order.forEach((i) => {
            const m = mk[i], wd = tlen(m.ln, fs), up = m.ty - m.ih / 2 - 9, mid = m.ty + 0.35 * fs;
            const cands = [
              ...m.ra < 34 ? [[m.tx + m.iw / 2 + 8, mid, "start"]] : [[m.tx, up, "middle"]],
              [m.tx, up, "middle"],
              [m.tx + m.iw / 2, up, "end"],
              [m.tx - m.iw / 2, up, "start"],
              [m.tx + m.iw / 2 + 8, mid, "start"],
              [m.tx - m.iw / 2 - 8, mid, "end"]
            ];
            const box = ([x, y, an]) => {
              const x0 = an === "start" ? x : an === "end" ? x - wd : x - wd / 2;
              return [x0, y - 0.74 * fs, x0 + wd, y + 0.25 * fs];
            };
            const ok = (c2) => {
              const b = box(c2);
              return b[0] >= 6 && b[2] <= W - 6 && b[1] >= 2 && thumbs.every((t, j) => !hit(b, t, j === i ? 0 : 8)) && placed.every((p) => !hit(b, p, 8));
            };
            let c = cands.find(ok);
            if (!c) {
              clear = false;
              c = cands[0];
            }
            placed.push(box(c));
            out[i] = c;
          });
          return { out, clear };
        };
        const fwd = mk.map((_, i) => i);
        let pick = spots(fwd);
        if (!pick.clear) {
          const back = spots(fwd.slice().reverse());
          if (back.clear) pick = back;
        }
        mk.forEach((m, i) => {
          const c = pick.out[i];
          m.lab.setAttribute("text-anchor", c[2]);
          m.lab.setAttribute("y", c[1]);
          m.ln.setAttribute("x", c[0]);
        });
      }
      mk.filter((_, i) => i === selected).forEach((m) => m.g.parentNode.append(m.g));
      const w = works[selected], a = lerp(w.angle, w.angle_past, s);
      const [cx, cy] = P(R, a), left = Math.sin(rad(a)) ** 2;
      const q = 12;
      tri.innerHTML = `
        <line class="q3fan-hyp" x1="${OX}" y1="${OY}" x2="${cx}" y2="${cy}"/>
        <line class="q3fan-leg-a" x1="${OX}" y1="${OY}" x2="${cx}" y2="${OY}"/>
        <line class="q3fan-leg-b" x1="${cx}" y1="${OY}" x2="${cx}" y2="${cy}"/>
        <polyline class="q3fan-right" points="${cx - q},${OY} ${cx - q},${OY - q} ${cx},${OY - q}"/>
        <path class="q3fan-theta" d="${arc(R * 0.25, 0, a)}"/>
        <text class="q3fan-th" x="${P(R * 0.25 + 20, a / 2)[0]}" y="${P(R * 0.25 + 20, a / 2)[1] + 5}">θ</text>
        <text class="q3fan-left" text-anchor="${cx - OX > R * 0.5 ? "end" : "start"}" x="${cx + (cx - OX > R * 0.5 ? -9 : 9)}" y="${OY - 62}"><tspan x="${cx + (cx - OX > R * 0.5 ? -9 : 9)}">left over</tspan><tspan x="${cx + (cx - OX > R * 0.5 ? -9 : 9)}" dy="1.15em">${pct(left)}</tspan></text>
        <text class="q3fan-desc" x="${OX + (cx - OX) / 2}" y="${OY + (narrow ? 44 : 22)}" text-anchor="middle">described ${pct(1 - left)}</text>`;
      if (narrow) {
        const lt = tri.querySelector(".q3fan-left"), tsp = [...lt.children], gap = 9;
        const wd = Math.max(...tsp.map((t) => tlen(t, fs))), top = OY - 62 - 0.74 * fs;
        const right = cx - OX + gap + wd <= Math.sqrt(R * R - (OY - top) ** 2) - 8;
        const x = cx + (right ? gap : -gap);
        lt.setAttribute("text-anchor", right ? "start" : "end");
        tsp.forEach((t) => t.setAttribute("x", x));
        lt.setAttribute("x", x);
      }
      host.dataset.state = state;
      host.querySelectorAll("[data-col]").forEach((el) => el.classList.toggle("is-on", +el.dataset.col === state));
    }
    function go(target) {
      if (target === state && s === target) return;
      state = target;
      buttons.forEach((b, i) => b.setAttribute("aria-pressed", i === state));
      status.textContent = state ? "Basis: the works before 1900 only. The median and the top-1% cut stay the whole-corpus values; this basis’s own cut is not drawn." : `Basis: the whole corpus (${d.n.toLocaleString("en-US")} works, ${d.encoder}, ${d.k} directions).`;
      cancelAnimationFrame(raf);
      if (reduced()) {
        s = state;
        render();
        return;
      }
      const from = s, t0 = performance.now(), dur = 800;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        s = lerp(from, state, ease(t));
        render();
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    buttons.forEach((b, i) => b.addEventListener("click", () => go(i)));
    status.textContent = `Basis: the whole corpus (${d.n.toLocaleString("en-US")} works, ${d.encoder}, ${d.k} directions).`;
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    fallback.classList.add("work-fallback");
    fallback.before(host);
    fallback.style.display = "none";
    render();
    matchMedia(NARROW).addEventListener("change", () => render());
    host.dataset.ready = "true";
  })().catch((e) => console.warn("Using static q3_fan figure", e));
})();
