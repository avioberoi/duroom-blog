(() => {
  const script = [...document.scripts].find((s) => s.src.endsWith("/q4_grid.js"));
  if (!script) return;
  const base = new URL(".", script.src);
  const figure = document.querySelector("#fig-q4-grid > figure");
  if (!figure) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pct = (x) => (100 * x).toFixed(1);
  const range = (c) => `${pct(c.lo)}–${pct(c.hi)}% left over`;
  const kinLine = (c) => c.row === "smallest_leftover" ? "" : c.row === "largest_leftover_isolates" ? "none of 10 neighbours in top 1%" : `${c.kin_lo}–${c.kin_hi} of 10 neighbours in top 1%`;
  const credit = (w) => `${w.artist}, ${w.title}, ${w.year ?? "date unknown"}`;
  const workLine = (w, row) => `${pct(w.share)}% left over` + (row === "largest_leftover_kinds" ? `; ${w.kin} of 10 neighbours in top 1%` : "");
  (async () => {
    const r = await fetch(new URL("data/q4_grid.json", base));
    if (!r.ok) throw new Error("q4_grid data unavailable");
    const d = await r.json();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("q4_grid.css", base);
    document.head.append(css);
    const cell = (e, row) => d.cells.find((c) => c.encoder === e && c.row === row);
    const med = Object.fromEntries(d.columns.map((c) => [c.encoder, c.median]));
    const encs = d.columns.map((c) => c.encoder);
    const host = document.createElement("div");
    host.className = "q4-grid-demo";
    const sections = d.rows.map((row) => `<section class="q4g-row"><h3 class="q4g-rowlabel">${esc(row.label)}</h3>` + encs.map((e) => {
      const c = cell(e, row.key), k = kinLine(c);
      return `<div class="q4g-cell" role="group" aria-label="${esc(e)}, ${esc(row.label.toLowerCase())}">
          <div class="q4g-enc">${esc(e)}</div>
          <div class="q4g-tiles">${c.works.map((w, i) => `<button type="button" class="q4g-tile" data-e="${esc(e)}" data-r="${row.key}" data-i="${i}" aria-label="${esc(credit(w))}. ${esc(workLine(w, row.key))}"><img src="${new URL(w.asset, base).href}" alt="" loading="lazy" decoding="async"></button>`).join("")}</div>
          <div class="q4g-bar" aria-hidden="true"><span style="left:${100 * c.lo}%;width:${100 * (c.hi - c.lo)}%"></span><i style="left:${100 * med[e]}%"></i></div>
          <div class="q4g-share">${range(c)}</div>${k ? `<div class="q4g-kin">${k}</div>` : ""}</div>`;
    }).join("") + "</section>").join("");
    const credits = d.rows.map((row) => encs.map((e) => {
      const c = cell(e, row.key);
      return `<section class="q4g-list"><h4>${esc(e)} · ${esc(row.label.toLowerCase())}</h4><ol>${c.works.map((w) => `<li>${esc(credit(w))} <span>${pct(w.share)}%${row.key === "largest_leftover_kinds" ? `, ${w.kin} of 10` : ""}</span></li>`).join("")}</ol></section>`;
    }).join("")).join("");
    host.innerHTML = `<div class="q4g-stage">
      <div class="q4g-head" aria-hidden="true"><span></span>${encs.map((e) => `<span>${esc(e)}</span>`).join("")}</div>
      ${sections}
      <p class="q4g-note">Each list runs in rank order from the top left. Bar: 0 to 100% left over; the tick is the encoder’s corpus median and the filled segment the range of these ${d.per_list}. Hover, focus or tap a work for its credit; WikiArt.</p>
      <div class="q4g-pop" hidden aria-hidden="true"><img alt=""><div class="q4g-pop-text"><span class="q4g-pop-artist"></span><span class="q4g-pop-title"></span><span class="q4g-pop-year"></span><span class="q4g-pop-share"></span></div></div></div>
      <details class="q4g-credits"><summary>Credits and leftover shares, all ${encs.length * d.rows.length * d.per_list} works</summary><div class="q4g-credit-lists">${credits}</div><p class="q4g-note">Leftover share: the share of a work’s squared distance from the average that the ${d.k} directions miss. Neighbours (largest-with-neighbours lists only): of a work’s 10 nearest by leftover, how many are also in the top 1%. WikiArt reproductions.</p></details>`;
    const stage = host.querySelector(".q4g-stage"), pop = host.querySelector(".q4g-pop");
    const img = pop.querySelector("img"), q = (s) => pop.querySelector(s);
    let pinned = null;
    const show = (btn) => {
      const c = cell(btn.dataset.e, btn.dataset.r), w = c.works[+btn.dataset.i];
      img.src = new URL(w.asset, base).href;
      q(".q4g-pop-artist").textContent = w.artist;
      q(".q4g-pop-title").textContent = w.title;
      q(".q4g-pop-year").textContent = w.year ?? "Date unknown";
      q(".q4g-pop-share").textContent = workLine(w, btn.dataset.r);
      pop.hidden = false;
      const s = stage.getBoundingClientRect(), b = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
      const left = Math.max(0, Math.min(s.width - pw, b.left - s.left + b.width / 2 - pw / 2));
      let top = b.bottom - s.top + 8;
      if (top + ph > s.height && b.top - s.top - ph - 8 > 0) top = b.top - s.top - ph - 8;
      pop.style.left = left + "px";
      pop.style.top = top + "px";
    };
    const hide = () => {
      pop.hidden = true;
    };
    host.querySelectorAll(".q4g-tile").forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        if (!pinned) show(btn);
      });
      btn.addEventListener("mouseleave", () => {
        if (!pinned && document.activeElement !== btn) hide();
      });
      btn.addEventListener("focus", () => show(btn));
      btn.addEventListener("blur", () => {
        if (pinned !== btn) hide();
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (pinned === btn) {
          pinned = null;
          hide();
        } else {
          pinned = btn;
          show(btn);
        }
      });
    });
    document.addEventListener("click", () => {
      if (pinned) {
        pinned = null;
        hide();
      }
    });
    host.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        pinned = null;
        hide();
      }
    });
    const details = host.querySelector("details");
    let was = null;
    window.addEventListener("beforeprint", () => {
      was = details.open;
      details.open = true;
    });
    window.addEventListener("afterprint", () => {
      if (was !== null) details.open = was;
    });
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    fallback.classList.add("work-fallback");
    fallback.before(host);
    fallback.style.display = "none";
    host.dataset.ready = "true";
    document.querySelectorAll(".q4g-static-credits").forEach((el) => {
      el.style.display = "none";
    });
  })().catch((e) => console.warn("Using static q4_grid figure", e));
})();
