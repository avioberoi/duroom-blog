(() => {
  const base = new URL(".", document.currentScript.src), figure = document.querySelector("#fig-q2-geometry > figure");
  if (!figure) return;
  fetch(new URL("data/q2_geometry.json", base)).then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  }).then((d) => {
    const host = document.createElement("div");
    host.className = "geometry-explorer search-explorer";
    host.innerHTML = '<p class="search-note">Measured CLIP works · grey before 1900, red after</p><canvas role="img" aria-label="Measured work coordinates on two retained basis directions and one selected leftover direction"></canvas><label class="search-slider">Look down or from the side<input aria-label="View elevation" type="range" min="5" max="85" value="25"></label><div class="search-controls"><button type="button" data-angle="80">Look down</button><button type="button" data-angle="12">Look from the side</button><button type="button" data-play aria-pressed="false">Rotate</button></div><p class="search-note">The paper-coloured plane is the first two basis directions. The black point is the earlier average. Turning the view changes what is visible; the works stay fixed.</p>';
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    fallback.before(host);
    fallback.style.display = "none";
    fallback.classList.add("search-fallback");
    const canvas = host.querySelector("canvas"), slider = host.querySelector("input"), play = host.querySelector("[data-play]");
    let az = -60, frame = null;
    function draw() {
      const W = Math.max(280, host.clientWidth), H = 330, ratio = devicePixelRatio || 1;
      canvas.style.width = "100%";
      canvas.style.height = H + "px";
      canvas.width = W * ratio;
      canvas.height = H * ratio;
      const c = canvas.getContext("2d");
      c.scale(ratio, ratio);
      const t = getComputedStyle(document.documentElement), col = (k) => t.getPropertyValue("--" + k).trim(), lim = d.limit, e = Number(slider.value) * Math.PI / 180, a = az * Math.PI / 180, scale = Math.min(W - 80, H - 60) / (2.2 * lim);
      const project = ([x, y, z]) => {
        const u = x * Math.cos(a) - y * Math.sin(a), v = x * Math.sin(a) + y * Math.cos(a);
        return [W / 2 + u * scale, H / 2 + (v * Math.sin(e) - z * Math.cos(e)) * scale, v * Math.cos(e) + z * Math.sin(e)];
      };
      const plane = [[-lim, -lim, 0], [lim, -lim, 0], [lim, lim, 0], [-lim, lim, 0]].map(project);
      c.fillStyle = col("hair");
      c.globalAlpha = 0.3;
      c.beginPath();
      plane.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
      const dots = d.groups.flatMap((g, i) => g.xyz.map((p) => ({ p: project(p), group: i }))).sort((a2, b) => a2.p[2] - b.p[2]);
      for (const dot of dots) {
        c.fillStyle = col(dot.group ? "accent" : "mute");
        c.globalAlpha = 0.25;
        c.beginPath();
        c.arc(dot.p[0], dot.p[1], 1.25, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      const origin = project([0, 0, 0]);
      c.fillStyle = col("ink");
      c.beginPath();
      c.arc(origin[0], origin[1], 3, 0, Math.PI * 2);
      c.fill();
      c.font = "13px " + col("serif");
      c.textAlign = "center";
      for (const [p, label] of [[[lim, 0, 0], "Basis 1"], [[0, lim, 0], "Basis 2"], [[0, 0, lim], "Leftover direction"]]) {
        const q = project(p);
        c.strokeStyle = col("mute");
        c.lineWidth = 0.7;
        c.beginPath();
        c.moveTo(...origin.slice(0, 2));
        c.lineTo(...q.slice(0, 2));
        c.stroke();
        c.fillText(label, Math.max(65, Math.min(W - 65, q[0])), Math.max(16, Math.min(H - 8, q[1] - 8)));
      }
    }
    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      play.textContent = "Rotate";
      play.setAttribute("aria-pressed", "false");
    }
    function tick() {
      az += 0.5;
      draw();
      frame = requestAnimationFrame(tick);
    }
    play.onclick = () => {
      if (frame) stop();
      else {
        play.textContent = "Pause";
        play.setAttribute("aria-pressed", "true");
        tick();
      }
    };
    host.querySelectorAll("[data-angle]").forEach((b) => b.onclick = () => {
      stop();
      slider.value = b.dataset.angle;
      draw();
    });
    slider.oninput = () => {
      stop();
      draw();
    };
    new ResizeObserver(draw).observe(host);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
    });
    draw();
    host.dataset.ready = "true";
  }).catch((e) => console.error("Q2 geometry unavailable", e));
})();
