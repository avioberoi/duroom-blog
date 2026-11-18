(() => {
  const figure = document.querySelector("#fig-manifold > figure");
  if (!figure) return;
  const base = new URL(".", document.currentScript.src), media = matchMedia("(max-width:600px)");
  fetch(new URL("data/intro_support.json", base)).then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  }).then((d) => {
    const fallback = figure.querySelector("picture") || figure.querySelector("img"), host = document.createElement("div");
    host.className = "support-explorer search-explorer";
    fallback.before(host);
    host.innerHTML = '<div class="search-controls"><label>Measured view<select aria-label="Measured view"><option>Requests · CLIP</option><option>Decoded renders · DINOv3</option><option>Decoded renders · SigLIP</option></select></label></div><p class="support-description search-note"></p><div class="support-rows"></div><p class="support-axis search-note"></p><p class="search-note">Dots: medians; lines: 1st–99th percentiles. Search rows include admissions only, excluding starts.</p>';
    const select = host.querySelector("select");
    function draw() {
      const plotWidth = Math.max(120, host.clientWidth * 0.56);
      const lens = [null, "dinov3-l", "siglip-so400m"][select.selectedIndex], xmin = lens ? 0 : -0.2, xmax = lens ? 1.5 : 1, scale = (v) => 5 + (plotWidth - 10) * (v - xmin) / (xmax - xmin);
      host.querySelector(".support-description").textContent = lens ? "Decoded renders, not original artworks. Shading is the distance range containing 95% of reference and calibration renders, with each render’s own source excluded. The 1900–1969 control is held out." : "Work vectors and admitted requests, relative to the reference’s mean direction.";
      host.querySelector(".support-axis").textContent = lens ? "Distance to nearest dated real work (chord); lower is closer. Solid boundary: real-render p95; dotted: p99." : "Cosine to reference mean direction; 1 points along that direction.";
      host.querySelector(".support-rows").innerHTML = d.rows.map((r, i) => {
        const item = lens ? r.renders[lens] : r.request, [lo, med, hi] = item.quantiles, label = r.label.replace("Search ·", "Free search, admitted ·").replace("Random directions ·", "Random directions, admitted ·").replace(/\bseed (\d)/g, "run $1");
        const bounds = lens ? d.baselines[lens] : null;
        return `<div class="support-row ${i === 3 || i === 6 ? "support-divider" : ""}"><span>${label}<small>n = ${item.n.toLocaleString()}</small></span><svg viewBox="0 0 ${plotWidth} 45" role="img" aria-label="${label}, median ${med.toFixed(3)}">${bounds ? `<rect x="5" y="0" width="${scale(bounds[1]) - 5}" height="45" fill="var(--hair)" opacity=".45"/><line x1="${scale(bounds[1])}" x2="${scale(bounds[1])}" y1="0" y2="45" stroke="var(--mute)"/><line x1="${scale(bounds[2])}" x2="${scale(bounds[2])}" y1="0" y2="45" stroke="var(--mute)" stroke-dasharray="2 3"/>` : ""}<line x1="${scale(lo)}" x2="${scale(hi)}" y1="22" y2="22" stroke="var(--${i < 3 ? "mute" : "accent"})" stroke-width="1.5"/><circle cx="${scale(med)}" cy="22" r="4" fill="var(--${i < 3 ? "mute" : "accent"})"/></svg></div>`;
      }).join("") + `<div class="support-row"><span></span><svg viewBox="0 0 ${plotWidth} 25" aria-hidden="true">${(lens ? [0, 0.5, 1, 1.5] : [0, 0.5, 1]).map((v) => `<text x="${scale(v)}" y="17" text-anchor="${v === xmax ? "end" : v === 0 ? "start" : "middle"}" fill="var(--mute)" font-size="14">${v}</text>`).join("")}</svg></div>`;
    }
    function layout() {
      host.hidden = false;
      fallback.style.display = "none";
      fallback.classList.add("search-fallback");
    }
    select.onchange = draw;
    media.addEventListener("change", layout);
    layout();
    draw();
    host.dataset.ready = "true";
    let lastWidth = host.clientWidth;
    new ResizeObserver(() => {
      if (Math.abs(host.clientWidth - lastWidth) > 1) {
        lastWidth = host.clientWidth;
        draw();
      }
    }).observe(host);
  }).catch((e) => console.error("Support view unavailable", e));
})();
