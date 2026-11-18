(() => {
  const fig = document.querySelector("#fig-q3-encoders > figure");
  if (!fig) return;
  const base = new URL(".", document.currentScript.src), narrow = matchMedia("(max-width:600px)");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  fetch(new URL("data/q3_encoders.json", base)).then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  }).then((d) => {
    const fallback = fig.querySelector("picture") || fig.querySelector("img"), host = document.createElement("div");
    host.className = "q3-encoders-demo work-explorer";
    fallback.before(host);
    fallback.classList.add("work-fallback");
    fallback.style.display = "none";
    host.innerHTML = `<div class="encoder-overlap-summary"><div><h3>Top 1% in common</h3><table><thead><tr><th>Encoders</th><th>Works</th><th>Share</th></tr></thead><tbody>${d.pairs.map((p) => `<tr><td>${esc(p.a)} · ${esc(p.b)}</td><td>${p.count}</td><td>${(100 * p.share).toFixed(1)}%</td></tr>`).join("")}</tbody></table><p class="work-note">Each list has ${d.n_top.toLocaleString()} works; ${(100 * d.chance).toFixed(0)}% in common by chance.</p></div><div><h3>${d.all_three.count} works in all three</h3><div class="encoder-era-key">${d.eras.map((e, i) => `<span><i class="era-${i}"></i>${esc(e.label)}: ${e.count}</span>`).join("")}</div><div class="encoder-count-grid" aria-label="${d.eras.map((e) => `${e.count} ${e.label}`).join(", ")}">${d.eras.map((e, i) => Array.from({ length: e.count }, () => `<i class="era-${i}"></i>`).join("")).join("")}</div><p class="work-note">One square per work. Their order is drawn.</p></div></div><div class="encoder-gallery-heading"><span>${d.shown} of these ${d.all_three.count} have images on file, oldest first</span><div><button type="button" class="encoder-prev">Previous</button><span class="encoder-page" aria-live="polite"></span><button type="button" class="encoder-next">Next</button></div></div><div class="encoder-work-grid"></div>`;
    let start = 0;
    const prev = host.querySelector(".encoder-prev"), next = host.querySelector(".encoder-next");
    function draw() {
      const size = narrow.matches ? 4 : 8;
      start = Math.min(start, Math.floor((d.works.length - 1) / size) * size);
      const rows = d.works.slice(start, start + size);
      host.querySelector(".encoder-work-grid").innerHTML = rows.map((w) => `<figure><img src="${new URL(w.asset, base)}" alt="${esc(w.artist + ", " + w.title + ", " + w.year)}"><figcaption>${esc(w.artist)}<br><em>${esc(w.title)}</em>, ${w.year}</figcaption></figure>`).join("");
      host.querySelector(".encoder-page").textContent = `${start + 1}–${start + rows.length} of ${d.works.length}`;
      prev.disabled = start === 0;
      next.disabled = start + size >= d.works.length;
    }
    prev.onclick = () => {
      start -= narrow.matches ? 4 : 8;
      draw();
    };
    next.onclick = () => {
      start += narrow.matches ? 4 : 8;
      draw();
    };
    narrow.addEventListener("change", () => {
      start = 0;
      draw();
    });
    draw();
    host.dataset.ready = "true";
  }).catch((e) => console.warn("Using static encoder comparison", e));
})();
