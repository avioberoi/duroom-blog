(() => {
  const { base, esc, percent, get, bar, card, strip, tabs } = window.DuRoomWorkUI;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("evidence-explorer.css", base);
  document.head.append(css);
  const picture = (name) => `<picture class="evidence-chart"><source media="(max-width:600px)" srcset="${new URL(name + "-mobile.svg", base)}"><img src="${new URL(name + ".svg", base)}" alt="Measured chart; definitions and values follow in the figure caption."></picture>`;
  async function frame(id, file, build) {
    const figure = document.querySelector(`#${id} > figure`);
    if (!figure) return;
    const data = await get(file), host = document.createElement("div");
    host.className = "work-explorer evidence-explorer";
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    await build(host, data, id);
    fallback.classList.add("work-fallback");
    fallback.before(host);
    fallback.style.display = "none";
    host.dataset.ready = "true";
  }
  function tabbed(host, id, labels, render) {
    let panel;
    const choose = tabs(host, labels, (i) => {
      panel.setAttribute("aria-labelledby", `${id}-tab-${i}`);
      render(panel, i);
    }, id);
    panel = document.createElement("div");
    panel.id = id + "-panel";
    panel.setAttribute("role", "tabpanel");
    panel.tabIndex = 0;
    host.append(panel);
    return choose;
  }
  function q4Lists(host, d, id) {
    let category = 0, comparison = 1, page = 0, panel;
    const choose = tabs(host, d.encoders[0].groups.map((g) => g.title), (i) => {
      category = i;
      page = 0;
      render();
    }, id);
    const controls = document.createElement("div");
    controls.className = "work-controls";
    controls.innerHTML = '<label>Compare CLIP with <select aria-label="Comparison encoder"><option value="1">DINOv3</option><option value="2">SigLIP</option></select></label>';
    host.append(controls);
    controls.querySelector("select").onchange = (e) => {
      comparison = Number(e.target.value);
      render();
    };
    panel = document.createElement("div");
    panel.id = id + "-panel";
    panel.setAttribute("role", "tabpanel");
    panel.tabIndex = 0;
    host.append(panel);
    function render() {
      panel.setAttribute("aria-labelledby", `${id}-tab-${category}`);
      const total = d.encoders[0].groups[category].works.length;
      panel.innerHTML = `<div class="work-controls"><button type="button" data-page="-1" ${page === 0 ? "disabled" : ""}>Previous examples</button><span>Examples ${page * 3 + 1}–${Math.min(page * 3 + 3, total)} of ${total}</span><button type="button" data-page="1" ${page * 3 + 3 >= total ? "disabled" : ""}>Next examples</button></div>` + [0, comparison].map((i) => {
        const e = d.encoders[i], g = e.groups[category];
        return `<section class="work-group"><div class="work-heading">${e.encoder} · ${g.title.toLowerCase()}</div>${strip(g.works.slice(page * 3, page * 3 + 3).map((w) => card(w, bar(w.share, "Left over") + (category < 2 ? `<p class="work-note">${w.kin} of 10 neighbours also in the top 1%.</p>` : ""))))}</section>`;
      }).join("") + `<p class="work-note">${d.k} corpus directions. Each encoder selects different works. The scores select these examples; the images do not establish which visual attributes caused the scores. Credits beneath the works; WikiArt.</p>`;
      panel.querySelectorAll("[data-page]").forEach((b) => b.onclick = () => {
        const step = b.dataset.page;
        page += Number(step);
        render();
        const target = panel.querySelector(`[data-page="${step}"]`);
        (target.disabled ? panel.querySelector("[data-page]:not(:disabled)") : target).focus();
      });
    }
    choose(0);
  }
  function q4Local(host, d) {
    let selected = 0;
    host.innerHTML = `<div class="work-controls"><label>Work <select aria-label="Locally unusual artwork">${d.works.map((w, i) => `<option value="${i}">${esc(w.artist)} · ${w.year}</option>`).join("")}</select></label></div><div class="evidence-local"></div><p class="work-note">Local ratio = the work’s distance to its ${d.k}th neighbour ÷ the median of its neighbours’ own ${d.k}th-neighbour distances. A ratio of 1 means the same spacing. These are ${d.works.length} selected works among ${d.all_three_count} in the local top 1% of all three encoders. WikiArt.</p>`;
    const panel = host.querySelector(".evidence-local");
    const maximum = Math.max(...d.works.flatMap((w) => w.scores.map((s) => s.absolute))) * 1.08;
    function render() {
      const w = d.works[selected];
      panel.innerHTML = card(w) + `<div class="evidence-local-scores">${w.scores.map((s) => `<section><div class="work-heading">${s.encoder} <span class="evidence-ratio">${s.local.toFixed(2)}×</span></div><div class="work-note">Work’s distance ${s.absolute.toFixed(3)}</div><div class="evidence-distance"><span style="width:${100 * s.absolute / maximum}%"></span></div><div class="work-note">Neighbours’ median ${s.neighbour_scale.toFixed(3)}</div><div class="evidence-distance secondary"><span style="width:${100 * s.neighbour_scale / maximum}%"></span></div></section>`).join("")}</div>`;
    }
    host.querySelector("select").onchange = (e) => {
      selected = Number(e.target.value);
      render();
    };
    render();
  }
  function eraChart(e, d) {
    const colors = ["var(--pale)", "var(--mute)", "var(--accent)"];
    let svg = '<svg class="evidence-era" viewBox="0 0 620 270" role="img" aria-label="Era shares in the three farthest lists and the whole corpus">';
    e.eras.forEach((row, i) => {
      const y = 24 + i * 53;
      let x = 155;
      const label = row.label === "Average direction" ? `<tspan x="145" dy="-9">Average</tspan><tspan x="145" dy="22">direction</tspan>` : esc(row.label);
      svg += `<text x="145" y="${y + 15}" text-anchor="end">${label}</text>`;
      row.shares.forEach((share, j) => {
        const width = share * 450;
        svg += `<rect x="${x}" y="${y}" width="${width}" height="27" fill="${colors[j]}"/>`;
        if (share >= 0.1) svg += `<text x="${x + width / 2}" y="${y + 18}" text-anchor="middle" style="fill:${j ? "var(--paper)" : "var(--ink)"}">${Math.round(100 * share)}%</text>`;
        else svg += `<text x="${x + width / 2}" y="${y - 5}" text-anchor="middle">${Math.round(100 * share)}%</text><line x1="${x + width / 2}" x2="${x + width / 2}" y1="${y - 3}" y2="${y}" stroke="var(--mute)"/>`;
        x += width;
      });
    });
    svg += '<text x="155" y="253">0%</text><text x="380" y="253" text-anchor="middle">50%</text><text x="605" y="253" text-anchor="end">100%</text></svg>';
    return `<div class="evidence-era-key">${d.era_labels.map((label, i) => `<span><i style="background:${colors[i]}"></i>${esc(label)}</span>`).join("")}</div>${svg}<p class="work-note">Each farthest list contains ${e.eras[0].total.toLocaleString()} works. Corpus row: all ${e.eras[3].total.toLocaleString()} works.</p><table class="evidence-table"><caption>How much of the two top-1% lists is shared?</caption><tbody>${e.overlap.map((r) => `<tr><th>${esc(r.pair)}</th><td>${percent(r.share)}</td></tr>`).join("")}</tbody></table>`;
  }
  function q5Far(host, d, id) {
    let encoder = 0, view = "eras", panel;
    const choose = tabs(host, d.encoders.map((e) => e.encoder), (i) => {
      encoder = i;
      render();
    }, id);
    const controls = document.createElement("div");
    controls.className = "work-controls";
    controls.innerHTML = '<label>View <select aria-label="Distance comparison view"><option value="eras">Eras and overlap</option><option value="works">Artwork examples</option></select></label>';
    host.append(controls);
    controls.querySelector("select").onchange = (e) => {
      view = e.target.value;
      render();
    };
    panel = document.createElement("div");
    panel.id = id + "-panel";
    panel.setAttribute("role", "tabpanel");
    panel.tabIndex = 0;
    host.append(panel);
    function render() {
      const e = d.encoders[encoder];
      panel.setAttribute("aria-labelledby", `${id}-tab-${encoder}`);
      panel.innerHTML = view === "eras" ? eraChart(e, d) : strip(e.examples.map((w) => `<div class="evidence-example"><div class="work-heading">${esc(w.selection)}</div>${card(w, `<div class="work-metric">${w.score_key === "local_all" ? "Local ratio" : "Distance"}: ${w.score.toFixed(3)}${w.score_key === "local_all" ? "×" : ""}</div>`)}</div>`)) + '<p class="work-note">First work in each selected category; the labels mean membership in one top-1% list and exclusion from the named other list. WikiArt.</p>';
      panel.insertAdjacentHTML("beforeend", `<p class="work-note">${esc(d.definition)}</p>`);
    }
    choose(0);
  }
  function q5Walk(host, d, id) {
    const choose = tabbed(host, id, ["Measured counts", "Nearest works"], (panel, view) => {
      if (view === 0) {
        panel.innerHTML = picture("q5_walk") + `<p class="work-note">Top: mean counts ± one standard deviation across ${d.seeds} draws. Bottom: ratios of mean counts at matched progress; path counts are interpolated. ${esc(d.reach_definition)}</p>`;
        return;
      }
      let route = "straight", index = 6;
      panel.innerHTML = '<div class="work-controls"><label>Route <select aria-label="Walk route"><option value="straight">Straight route</option><option value="path">Decade path</option></select></label></div><label class="evidence-slider">Position <input type="range" min="0" step="1" aria-label="Position along the route"></label><div class="evidence-neighbour"></div>';
      const slider = panel.querySelector("input"), display = panel.querySelector(".evidence-neighbour");
      function render() {
        const rows = d.examples[route], r = rows[index];
        slider.max = rows.length - 1;
        slider.value = index;
        const progress = Math.max(0, 100 * r.progress).toFixed(1);
        slider.setAttribute("aria-valuetext", `${progress} percent of the way`);
        display.innerHTML = card(r.work) + `<div><div class="work-heading">${progress}% of the way</div><p>${r.label && r.label !== "between" ? esc(r.label) + " · " : ""}${route === "straight" ? "Straight route" : "Decade path"}</p><p><strong>${Math.round(r.count).toLocaleString()}</strong> works within reach<br><span class="work-note">Mean across ${d.seeds} draws; SD ${Math.round(r.sd).toLocaleString()}.</span></p><p>Nearest work’s distance: ${r.work.distance.toFixed(3)}<br><span class="work-note">First draw, cap ${d.default_cap} per artist.</span></p></div>`;
      }
      slider.oninput = () => {
        index = Number(slider.value);
        render();
      };
      panel.querySelector("select").onchange = (e) => {
        const progress = d.examples[route][index].progress;
        route = e.target.value;
        index = d.examples[route].reduce((best, r, i, rows) => Math.abs(r.progress - progress) < Math.abs(rows[best].progress - progress) ? i : best, 0);
        render();
      };
      panel.insertAdjacentHTML("beforeend", `<p class="work-note">${esc(d.artwork_definition)} WikiArt.</p>`);
      render();
    });
    choose(0);
  }
  function ranking(rows) {
    const max = Math.max(...rows.map((r) => r.gain)) * 1.1;
    return `<div class="work-heading">Median gain from one to up to three lumps</div><ol class="evidence-ranking">${rows.map((r) => `<li><span>${esc(r.label === "nude painting (nu)" ? "nude" : r.label)}</span><span class="evidence-rank-bar"><i style="width:${100 * r.gain / max}%"></i></span><span>${(100 * r.gain).toFixed(1)}</span></li>`).join("")}</ol><p class="work-note">Percentage points; all bars start at zero.</p>`;
  }
  function q6Works(host, d, id) {
    const choose = tabbed(host, id, ["Genres", "Styles", "Large gain", "Small gain"], (panel, i) => {
      panel.innerHTML = i < 2 ? ranking(i === 0 ? d.genres : d.styles) + `<p class="work-note">Selected high and low groups with at least ${d.minimum_group_n} works. Overall median gain: ${(100 * d.median_gain).toFixed(1)} points.</p>` : strip(d.groups[i - 2].works.map((w) => card(w, bar(w.one, "One lump", true) + bar(w.three, "Up to three") + `<p class="work-metric">Gain: ${(100 * w.gain).toFixed(1)} points</p>`))) + '<p class="work-note">First three distinct artists in each ranked gain list. These are original works, not images rebuilt from lumps. WikiArt.</p>';
      panel.insertAdjacentHTML("beforeend", `<p class="work-note">CLIP; ${d.k} available lumps. The fit adds directions, refitting non-negative weights after each addition. These are parts of a vector fit, not pieces of an image.</p>`);
    });
    choose(0);
  }
  Promise.allSettled([
    frame("fig-q4-lists", "q4_lists", q4Lists),
    frame("fig-q4-local", "q4_local", q4Local),
    frame("fig-q5-far", "q5_far", q5Far),
    frame("fig-q5-walk", "q5_walk", q5Walk),
    frame("fig-q6-works", "q6_works", q6Works)
  ]).then((results) => results.forEach((r) => {
    if (r.status === "rejected") console.warn("Using static evidence figure", r.reason);
  }));
})();
