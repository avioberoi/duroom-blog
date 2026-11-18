(() => {
  const script = [...document.scripts].find((s) => s.src.endsWith("/work-explorer.js"));
  const base = new URL(".", script.src);
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("work-explorer.css", base);
  document.head.append(css);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const percent = (x) => `${(100 * x).toFixed(1)}%`;
  const get = async (name) => {
    const r = await fetch(new URL(`data/${name}.json`, base));
    if (!r.ok) throw Error(`${name} unavailable`);
    return r.json();
  };
  const bar = (value, label, secondary = false) => `<div class="work-metric ${secondary ? "secondary" : ""}">${esc(label)} ${percent(value)}</div><div class="work-bar ${secondary ? "secondary" : ""}" aria-hidden="true"><span style="width:${100 * value}%"></span></div>`;
  function card(w, metric = "") {
    let title = w.title;
    if (w.year) {
      const cleaned = title.replace(new RegExp("\\s*[,;–—-]?\\s+" + w.year + "\\s*$"), "").trim();
      if (cleaned) title = cleaned;
    }
    if (title.length > 64) title = title.slice(0, 64).replace(/\s+\S*$/, "") + "…";
    const url = new URL(w.asset, base).href, credit = `${w.artist}, ${title}, ${w.year ?? "date unknown"}`;
    return `<figure class="work-card"><a href="${url}" target="_blank" rel="noopener" aria-label="View ${esc(credit)}"><img src="${url}" alt="${esc(credit)}" loading="lazy"></a><figcaption><span class="work-artist">${esc(w.artist)}</span><span class="work-title">${esc(title)}</span><span class="work-year">${esc(w.year ?? "Date unknown")}</span></figcaption>${metric}</figure>`;
  }
  const strip = (items) => `<p class="work-swipe">Swipe to compare the works.</p><div class="work-strip">${items.join("")}</div>`;
  function tabs(host, labels, select, prefix) {
    const nav = document.createElement("div");
    nav.className = "work-tabs";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Artwork views");
    nav.innerHTML = labels.map((label, i) => `<button type="button" role="tab" id="${prefix}-tab-${i}" aria-controls="${prefix}-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(label)}</button>`).join("");
    host.append(nav);
    const buttons = [...nav.children];
    const choose = (i) => {
      buttons.forEach((b, j) => {
        b.setAttribute("aria-selected", String(i === j));
        b.tabIndex = i === j ? 0 : -1;
      });
      select(i);
      host.dataset.view = i;
    };
    buttons.forEach((b, i) => {
      b.onclick = () => choose(i);
      b.onkeydown = (e) => {
        let next;
        if (e.key === "ArrowRight") next = (i + 1) % buttons.length;
        if (e.key === "ArrowLeft") next = (i + buttons.length - 1) % buttons.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = buttons.length - 1;
        if (next !== void 0) {
          e.preventDefault();
          choose(next);
          buttons[next].focus();
        }
      };
    });
    return choose;
  }
  async function mountGallery(id, file, mode) {
    const figure = document.querySelector(`#${id} figure`);
    if (!figure) return;
    const d = await get(file), host = document.createElement("div");
    host.className = "work-explorer";
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    fallback.classList.add("work-fallback");
    const groupHTML = (g) => `<section class="work-group"><div class="work-heading">${esc(g.title)}</div>${g.description ? `<p>${esc(g.description)}</p>` : ""}${strip(g.works.map((w) => {
      if (mode === "q4") return card(w, bar(w.kept, "Kept"));
      let metric = bar(w.share, "Left over, corpus basis");
      if (g.key === "largest_under_past_not_record") metric += bar(w.share_past, "Left over, basis from before 1900", true);
      if (g.key.includes("kinds") || g.key.includes("isolates")) metric += `<p class="work-note">${w.kin} of 10 nearest works also in the top 1%.</p>`;
      return card(w, metric);
    }))}</section>`;
    {
      let panel;
      const choose = tabs(host, d.groups.map((g) => g.title), (i) => {
        panel.innerHTML = groupHTML(d.groups[i]);
        panel.setAttribute("aria-labelledby", `${id}-tab-${i}`);
      }, id);
      panel = document.createElement("div");
      panel.id = `${id}-panel`;
      panel.setAttribute("role", "tabpanel");
      panel.tabIndex = 0;
      host.append(panel);
      choose(0);
      host.insertAdjacentHTML("beforeend", mode === "q3" ? '<p class="work-note">Neighbours are compared by the directions of their leftovers. These images are the scored works, not reconstructions. Source: WikiArt.</p>' : `<p class="work-note">Later works kept least by each encoder’s pre-1900 basis. ${d.k} directions; cap ${d.cap}; one fit, seed ${d.seed}. First three distinct artists in each ranked list. Source: WikiArt.</p>`);
    }
    fallback.before(host);
    fallback.style.display = "none";
    host.dataset.ready = "true";
  }
  async function mountPath() {
    const figure = document.querySelector("#fig-q1b-path figure");
    if (!figure) return;
    const d = await get("q2_works"), host = document.createElement("div");
    host.className = "work-explorer";
    let selected = d.decades.findIndex((r) => r.decade === d.default_decade), panel, currentView = 0;
    const choose = tabs(host, ["Decade path", "Axis 1 ends", "Axis 2 ends"], (i) => {
      currentView = i;
      render();
    }, "q2-works");
    panel = document.createElement("div");
    panel.id = "q2-works-panel";
    panel.setAttribute("role", "tabpanel");
    panel.tabIndex = 0;
    host.append(panel);
    function render() {
      panel.setAttribute("aria-labelledby", `q2-works-tab-${currentView}`);
      if (currentView) {
        const key = `axis${currentView}`, ends = d.ends[key];
        panel.innerHTML = ["high", "low"].map((end, i) => `<section class="work-group"><div class="work-heading">${i ? "Opposite end" : "Farther along"} axis ${currentView} (${i ? "−" : "+"})</div>${strip(ends[end].map((w) => card(w, `<p class="work-metric">Axis ${currentView}: ${(w.loading / d.scale).toFixed(1)} axis-1 past spreads</p>`)))}</section>`).join("") + '<p class="work-note">Selected high and low loadings among later works, one per artist. Both axes use the pre-1900 axis-1 RMS; the ring uses this same radius on both axes. Source: WikiArt.</p>';
        return;
      }
      const row = d.decades[selected];
      panel.innerHTML = `<svg class="work-path" role="img" aria-label="Measured decade path with the selected decade highlighted"></svg><div class="work-controls"><label>Decade <select aria-label="Decade">${d.decades.map((r, i) => `<option value="${i}" ${i === selected ? "selected" : ""}>${r.decade}s</option>`).join("")}</select></label><button type="button" data-step="-1">Previous</button><button type="button" data-step="1">Next</button></div><div class="work-heading">Nearest to the ${row.decade}s average position</div><p class="work-note">${row.n.toLocaleString()} works in this decade. Selection uses three measured coordinates; the chart shows two. An average can lie between clusters.</p>${strip(row.works.map((w) => card(w)))}<p class="work-note">Units: one pre-1900 axis-1 spread. Grey dots precede 1900; the ring marks one spread. Source: WikiArt.</p>`;
      panel.querySelector("select").onchange = (e) => {
        selected = Number(e.target.value);
        render();
        panel.querySelector("select").focus();
      };
      panel.querySelectorAll("[data-step]").forEach((b) => {
        b.disabled = selected + Number(b.dataset.step) < 0 || selected + Number(b.dataset.step) >= d.decades.length;
        b.onclick = () => {
          selected += Number(b.dataset.step);
          render();
          panel.querySelector("select").focus();
        };
      });
      draw();
      panel.querySelectorAll(".work-card a").forEach((a, i) => {
        a.onmouseenter = a.onfocus = () => draw(i);
        a.onmouseleave = a.onblur = () => draw();
      });
      host.dataset.decade = row.decade;
    }
    function draw(workIndex) {
      const svg = panel.querySelector("svg");
      if (!svg) return;
      const mobile = host.clientWidth < 480, W = mobile ? 440 : 620, H = 370, scale = Math.min((W - 100) / 10, 275 / 7), left = (W - 10 * scale) / 2, ox = left + 2 * scale, oy = 285 - 2 * scale;
      const x = (n) => ox + n / d.scale * scale, y = (n) => oy - n / d.scale * scale;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      let body = `<line class="axis" x1="${left}" x2="${W - left}" y1="${oy}" y2="${oy}"/><line class="axis" x1="${ox}" x2="${ox}" y1="20" y2="295"/><circle class="spread" cx="${ox}" cy="${oy}" r="${scale}"/>`;
      for (const tick of [0, 2, 4, 6]) body += `<text x="${ox + tick * scale}" y="320" text-anchor="middle">${tick}</text>`;
      for (const tick of [0, 2, 4]) body += `<text x="${left - 8}" y="${oy - tick * scale + 6}" text-anchor="end">${tick}</text>`;
      body += `<text x="${W / 2}" y="355" text-anchor="middle">Axis 1</text><text transform="translate(18 160) rotate(-90)" text-anchor="middle">Axis 2</text>`;
      let previous;
      for (const r of d.plane) {
        if (r.decade < d.cutoff) {
          body += `<circle class="past" cx="${x(r.axis1)}" cy="${y(r.axis2)}" r="2.4"/>`;
          continue;
        }
        if (previous && r.decade - previous.decade === 10) body += `<path class="path" d="M${x(previous.axis1)} ${y(previous.axis2)}L${x(r.axis1)} ${y(r.axis2)}"/>`;
        body += `<circle class="later" data-decade="${r.decade}" cx="${x(r.axis1)}" cy="${y(r.axis2)}" r="4"><title>${r.decade}s average</title></circle>`;
        if ([1900, 1950, 2010].includes(r.decade)) body += `<text text-anchor="${r.decade === 1900 ? "end" : "start"}" x="${x(r.axis1) + (r.decade === 1900 ? -12 : r.decade === 1950 ? 0 : 8)}" y="${y(r.axis2) + (r.decade === 2010 ? 23 : -12)}">${r.decade}</text>`;
        previous = r;
      }
      const row = d.decades[selected], mean = row.mean;
      body += `<circle class="selected" cx="${x(mean[1])}" cy="${y(mean[2])}" r="6"/>`;
      if (workIndex !== void 0) {
        const c = row.works[workIndex].coords;
        body += `<line class="work-link" x1="${x(mean[1])}" y1="${y(mean[2])}" x2="${x(c[1])}" y2="${y(c[2])}"/><circle class="selected-work" cx="${x(c[1])}" cy="${y(c[2])}" r="7"/>`;
      }
      svg.innerHTML = body;
      svg.querySelectorAll("[data-decade]").forEach((dot) => dot.onclick = () => {
        const i = d.decades.findIndex((r) => r.decade === Number(dot.dataset.decade));
        if (i >= 0) {
          selected = i;
          render();
        }
      });
    }
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    fallback.classList.add("work-fallback");
    fallback.before(host);
    choose(0);
    fallback.style.display = "none";
    host.dataset.ready = "true";
    new ResizeObserver(() => {
      if (!currentView) draw();
    }).observe(host);
  }
  window.DuRoomWorkUI = { base, esc, percent, get, bar, card, strip, tabs };
  Promise.allSettled([mountPath(), mountGallery("fig-q3-works", "q3_works", "q3"), mountGallery("fig-q1-worst", "q4_works", "q4")]).then((results) => results.forEach((r) => {
    if (r.status === "rejected") console.warn("Using static artwork figure", r.reason);
  }));
})();
