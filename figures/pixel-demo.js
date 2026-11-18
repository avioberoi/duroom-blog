(() => {
  const script = [...document.scripts].find((s) => s.src.endsWith("/pixel-demo.js"));
  const base = new URL(".", script.src);
  let promise;
  const data = () => promise ||= fetch(new URL("data/pixel_demo.json", base)).then((r) => {
    if (!r.ok) throw new Error("Pixel example unavailable");
    return r.json();
  });
  const url = (asset) => new URL(asset, base).href;
  const percent = (value) => `${(100 * value).toFixed(1)}%`;
  const card = (name, title, detail = "") => `<div class="pixel-card"><div class="pixel-label">${title}</div><img data-image="${name}" alt="${title}"><p>${detail}</p></div>`;
  const setImage = (host, name, asset) => {
    host.querySelector(`[data-image="${name}"]`).src = url(asset);
  };
  const share = (host, kept) => {
    host.querySelector(".pixel-share-kept").style.width = `${100 * kept}%`;
    host.querySelector(".pixel-share-missed").style.width = `${100 * (1 - kept)}%`;
  };
  const bar = '<div class="pixel-share" aria-hidden="true"><span class="pixel-share-kept"></span><span class="pixel-share-missed"></span></div>';
  const scaleNote = "Residual colours: dark = negative, paper = zero, red = positive. The scale stays fixed, so a fading residual means less is missed.";
  async function mountBasis(host, next) {
    const d = await data();
    host.classList.add("pixel-demo");
    host.innerHTML = `
      <p class="pixel-warning">Analogy in pixels, not CLIP</p>
      <p>Here the numbers are monochrome pixels, so we can turn the shadow back into an image. Each non-overlapping ${d.patch_size} × ${d.patch_size} patch is a vector of ${d.dimensions} values. Fit the basis on the left half; reconstruct the unseen right half.</p>
      <div class="pixel-training-image"><img src="${url(d.full_image)}" alt="The Great Wave in monochrome, split vertically into a training left half and held-out right half"><div><span>Fit the basis here</span><span>Test on this half</span></div></div>
      <label class="pixel-slider-label" for="pixel-rank">Directions kept <output></output></label>
      <input id="pixel-rank" type="range" min="0" max="${d.frames.length - 1}" step="1" value="${d.initial_frame}">
      <div class="pixel-presets"><button type="button" data-frame="0">Average only</button><button type="button" data-frame="${d.initial_frame}">Some directions</button><button type="button" data-frame="${d.frames.length - 1}">All directions</button></div>
      <div class="pixel-results" aria-live="polite"></div>${bar}
      <div class="pixel-images">
        ${card("original", "Held-out pixels", "The right half, unseen by the basis.")}
        ${card("kept", "Average + shadow", "The same mean patch is added back to each retained patch vector.")}
        ${card("missed", "Missed", "Input minus reconstruction: actual signed differences.")}
      </div>
      <p class="pixel-scale">${scaleNote}</p>
      <details class="pixel-direction">
        <summary>What does one direction change?</summary>
        <p>A direction is a pattern of pixel changes. Its score tells us how much of that pattern to add or subtract. Here is the first direction learned from these patches.</p>
        <div class="pixel-patterns">
          ${card("minus", "Subtract pattern")}${card("mean", "Average patch")}${card("plus", "Add pattern")}${card("direction", "Signed pattern")}
        </div>
      </details>
      <p class="pixel-limit">The basis and average use ${d.training_count.toLocaleString()} left-half patches. Shares sum squared distances over ${d.patch_count.toLocaleString()} held-out right-half patches. Display values are clipped only when drawing the images. These are pixel results, not what CLIP retains.</p>
      <button class="pixel-next" type="button">Compare bases →</button>`;
    setImage(host, "original", d.original);
    for (const key of ["minus", "mean", "plus", "direction"]) setImage(host, key, d[key]);
    const range = host.querySelector("input");
    function render() {
      const frame = d.frames[Number(range.value)];
      host.querySelector("output").textContent = `${frame.k} of ${d.dimensions}`;
      host.querySelector(".pixel-results").textContent = `Kept ${percent(frame.kept)} · missed ${percent(frame.missed)} of squared distance`;
      setImage(host, "kept", frame.reconstruction);
      setImage(host, "missed", frame.residual);
      share(host, frame.kept);
      host.dataset.rank = frame.k;
    }
    range.addEventListener("input", render);
    host.querySelectorAll("[data-frame]").forEach((b) => b.addEventListener("click", () => {
      range.value = b.dataset.frame;
      render();
    }));
    host.querySelector(".pixel-next").addEventListener("click", next);
    render();
    host.dataset.ready = "true";
  }
  async function mountMovement(host) {
    const d = await data(), m = d.movement;
    let mode = "shift", centre = "basis";
    host.classList.add("pixel-demo", "pixel-movement");
    host.innerHTML = `
      <div class="direction-heading">A move or a change of spread?</div>
      <p class="pixel-warning">Controlled analogy in pixels, not CLIP</p>
      <p>Change the same image in two different ways. Keep the original ${m.k}-direction basis fixed, then change which average is subtracted.</p>
      <div class="pixel-choices" role="group" aria-label="Kind of change"><button type="button" data-mode="shift">Move the average</button><button type="button" data-mode="spread">Change the spread</button></div>
      <p class="pixel-operation"></p>
      <div class="pixel-images pixel-pair">${card("original", "Starting image")}${card("changed", "Changed image")}</div>
      <div class="pixel-choices" role="group" aria-label="Average to subtract"><button type="button" data-centre="basis">Subtract original average</button><button type="button" data-centre="own">Subtract its own average</button></div>
      <div class="pixel-mean-choice"><img data-image="mean" alt="The chosen average patch"><p>Average being subtracted<br><span class="pixel-scale">Subtract this patch at every location.</span></p></div>
      <div class="pixel-results" aria-live="polite"></div>${bar}
      <div class="pixel-images">${card("offset", "After subtraction", "Changed pixels minus the chosen average.")}${card("kept", "Average + shadow", "The mean is added back for display.")}${card("missed", "Missed", "Changed pixels minus the reconstruction.")}</div>
      <p class="pixel-conclusion" aria-live="polite"></p>
      <p class="pixel-scale">${scaleNote}</p>
      <p class="pixel-limit">This controlled construction fits the starting patches, then changes them to isolate the two mechanisms. It is not a held-out result or a transformation of the artworks in the CLIP chart below. Shares sum squared distances over all patches, before display clipping.</p>
      `;
    const parts = [...host.children];
    const inputColumn = document.createElement("div");
    inputColumn.className = "pixel-input-column";
    const outputColumn = document.createElement("div");
    outputColumn.className = "pixel-output-column";
    parts.slice(0, 6).forEach((e) => inputColumn.append(e));
    parts.slice(6, 12).forEach((e) => outputColumn.append(e));
    host.prepend(inputColumn, outputColumn);
    setImage(host, "original", d.original);
    function render() {
      const variant = m.variants[mode], state = variant.centres[centre];
      host.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
      host.querySelectorAll("[data-centre]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.centre === centre)));
      host.querySelector(".pixel-operation").textContent = mode === "shift" ? "Add the same pixel pattern to every patch. Their average moves; how the patches differ from one another stays the same." : "Rotate the patch offsets toward a direction outside the retained basis. The average stays fixed; the pattern of variation changes.";
      setImage(host, "changed", variant.image);
      setImage(host, "mean", state.mean);
      for (const key of ["offset", "missed"]) setImage(host, key, state[key === "missed" ? "residual" : key]);
      setImage(host, "kept", state.reconstruction);
      host.querySelector(".pixel-results").textContent = `Kept ${percent(state.kept)} · missed ${percent(state.missed)}. Starting image: ${percent(m.baseline_kept)} kept.`;
      share(host, state.kept);
      host.querySelector(".pixel-conclusion").textContent = mode === "shift" ? centre === "own" ? "Subtracting the new average removes the added pattern exactly. The centred offsets and share kept return to the starting image’s values." : "Measured from the original average, the added pattern lies outside the basis. Try subtracting the changed image’s own average." : "The two averages are the same. Changing which one is subtracted cannot repair the changed spread, so the share kept stays lower.";
      host.dataset.mode = mode;
      host.dataset.centre = centre;
    }
    host.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      render();
    }));
    host.querySelectorAll("[data-centre]").forEach((b) => b.addEventListener("click", () => {
      centre = b.dataset.centre;
      render();
    }));
    render();
    host.dataset.ready = "true";
  }
  async function mountCloud(host) {
    const response = await fetch(new URL("data/measured_moves.json", base));
    if (!response.ok) throw new Error("Measured centring views unavailable");
    const d = await response.json();
    let group = "time", kind = "real", centred = false;
    host.className = "pixel-demo measured-moves";
    host.innerHTML = `<div class="direction-heading">The same measured works, before and after centring</div>
      <p class="pixel-warning">Measured CLIP · the residual direction was fitted on other artists</p>
      <div class="pixel-choices" role="group" aria-label="Measured group"><button type="button" data-group="time">After 1900</button><button type="button" data-group="east_asian">East Asian prints</button></div>
      <div class="pixel-choices" role="group" aria-label="Test group or held-out control"><button type="button" data-kind="real">Test group</button><button type="button" data-kind="placebo">Held-out control</button></div>
      <div class="measured-key"><span class="measured-basis-key"></span><span class="measured-test-key"></span></div>
      <svg class="measured-drawing" viewBox="0 0 420 340" role="img" aria-label="Measured work positions along a retained basis direction and an independently fitted residual direction"></svg>
      <div class="pixel-choices" role="group" aria-label="Centre the measured groups"><button type="button" data-centred="false">From the basis average</button><button type="button" data-centred="true">Each group’s own average</button></div>
      <p class="measured-meaning" aria-live="polite"></p><details class="measured-details"><summary>Sampling and independent directions</summary><p class="measured-spread"></p><p class="pixel-limit measured-scope"></p></details>`;
    const svg = host.querySelector("svg");
    function draw() {
      const g = d.groups[group], selected = g.views[kind], v = selected.view, [lo, hi] = g.bounds;
      const y = (t) => 280 - (t - lo) / (hi - lo) * 260;
      const sx = (t) => 100 + (t - lo) / (hi - lo) * 260;
      let body = `<line x1="${sx(lo)}" x2="${sx(hi)}" y1="${y(0)}" y2="${y(0)}" class="measured-axis"/><line x1="${sx(0)}" x2="${sx(0)}" y1="${y(lo)}" y2="${y(hi)}" class="measured-axis"/>`;
      for (const t of [lo, 0, hi]) body += `<text x="${sx(t)}" y="305" text-anchor="middle">${t.toFixed(1)}</text><text x="87" y="${y(t) + 6}" text-anchor="end">${t.toFixed(1)}</text>`;
      body += '<text x="230" y="335" text-anchor="middle">Basis direction 1</text><text transform="translate(28 150) rotate(-90)" text-anchor="middle">Residual direction</text>';
      for (const p of v.basis_group_from_basis_mean) body += `<circle cx="${sx(p[0])}" cy="${y(p[1])}" r="1.5" class="measured-basis"/>`;
      for (const p of v.test_from_basis_mean) body += `<circle cx="${sx(p[0])}" cy="${y(p[1])}" r="1.5" class="measured-test"/>`;
      body += `<rect x="${sx(0) - 5}" y="${y(0) - 5}" width="10" height="10" class="measured-basis-centre"/><circle class="measured-test-centre" r="5"/>`;
      svg.innerHTML = body;
      host.querySelector(".measured-basis-key").textContent = g.basis_group_label + " (grey)";
      host.querySelector(".measured-test-key").textContent = (kind === "real" ? g.test_group_label : "Held-out control") + " (red)";
      host.querySelector(".measured-spread").textContent = `Residual spread, mean across ${g.repeats} splits: test group ${g.spread_real[0].toFixed(3)}; control ${g.spread_control[0].toFixed(3)}.`;
      host.querySelector(".measured-scope").textContent = `${selected.sample_basis.toLocaleString()} basis-group works and ${selected.sample_test.toLocaleString()} held-out works shown (split 1 of ${g.repeats}). The residual direction is fitted on half A, by artist; only half B is shown. Test and control use separately fitted residual directions, with matched sample sizes. These are separate fits from the gap chart below.${selected.undated ? ` Includes ${selected.undated} undated works.` : ""}`;
      render();
    }
    function render() {
      const g = d.groups[group], v = g.views[kind].view, [lo, hi] = g.bounds;
      const sx = (t) => 100 + (t - lo) / (hi - lo) * 260, y = (t) => 280 - (t - lo) / (hi - lo) * 260;
      const state = centred ? "test_from_own_mean" : "test_from_basis_mean";
      [...svg.querySelectorAll(".measured-test")].forEach((dot, i) => {
        dot.setAttribute("cx", sx(v[state][i][0]));
        dot.setAttribute("cy", y(v[state][i][1]));
      });
      const centre = v.centres[state].centre;
      const marker = svg.querySelector(".measured-test-centre");
      marker.setAttribute("cx", sx(centre[0]));
      marker.setAttribute("cy", y(centre[1]));
      host.querySelectorAll("[data-group]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.group === group)));
      host.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
      host.querySelectorAll("[data-centred]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.centred === String(centred))));
      host.querySelector(".measured-meaning").textContent = centred ? "The average positions coincide. Every red point moved by the same amount; distances between red points did not change. This is what centring removes." : "The square marks the basis group’s average; the red dot marks the test group’s average. Centre the groups to remove their difference of location.";
      host.dataset.group = group;
      host.dataset.kind = kind;
      host.dataset.centred = String(centred);
    }
    host.querySelectorAll("[data-group]").forEach((b) => b.addEventListener("click", () => {
      group = b.dataset.group;
      draw();
    }));
    host.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => {
      kind = b.dataset.kind;
      draw();
    }));
    host.querySelectorAll("[data-centred]").forEach((b) => b.addEventListener("click", () => {
      centred = b.dataset.centred === "true";
      render();
    }));
    draw();
    host.dataset.ready = "true";
  }
  window.DuroomPixels = { mountBasis };
  const figure = document.querySelector("#fig-move-vs-reorder figure");
  if (figure) {
    let select2 = function(index) {
      host.hidden = index !== 1;
      evidence.hidden = index !== 0;
      tabs.forEach((t, i) => {
        t.setAttribute("aria-selected", String(index === i));
        t.tabIndex = index === i ? 0 : -1;
      });
    };
    var select = select2;
    const shell = document.createElement("div");
    shell.className = "pixel-demo movement-shell";
    figure.prepend(shell);
    shell.innerHTML = '<div class="pixel-choices movement-views" role="tablist" aria-label="Measured coordinates or image analogy"><button type="button" role="tab" aria-selected="true" id="movement-tab-measured" aria-controls="movement-measured">Measured works</button><button type="button" role="tab" aria-selected="false" id="movement-tab-pixels" aria-controls="movement-pixels" tabindex="-1">See it in pixels</button></div>';
    const host = document.createElement("div"), cloud = document.createElement("div");
    host.id = "movement-pixels";
    cloud.id = "movement-measured";
    host.hidden = true;
    for (const [panel, id] of [[host, "movement-tab-pixels"], [cloud, "movement-tab-measured"]]) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", id);
      panel.tabIndex = 0;
      shell.append(panel);
    }
    const tabs = [...shell.querySelectorAll("[role=tab]")];
    const evidence = document.createElement("div");
    evidence.className = "movement-evidence";
    cloud.before(evidence);
    evidence.append(cloud);
    const comparison = document.createElement("div");
    comparison.className = "movement-comparison";
    comparison.innerHTML = '<div class="direction-heading">What centring changes in the full comparison</div><p class="pixel-warning">Measured CLIP group gaps · 32 directions · five draws</p><img src="' + new URL("move_vs_reorder-mobile.svg", base) + '" alt="The time gap persists after centring; the East Asian gap nearly vanishes."><p class="pixel-limit">The gap uses all 32 directions and a random-basis comparison. The cloud at left uses a separate fit and shows only two coordinates; its shape alone does not measure this gap.</p>';
    evidence.append(comparison);
    tabs.forEach((button, index) => {
      button.addEventListener("click", () => select2(index));
      button.addEventListener("keydown", (e) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const next = e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - index;
          select2(next);
          tabs[next].focus();
        }
      });
    });
    const fallback = figure.querySelector("picture") || figure.querySelector("img");
    Promise.all([mountMovement(host), mountCloud(cloud)]).then(() => {
      fallback.classList.add("movement-fallback");
      select2(0);
    }).catch((e) => {
      shell.remove();
      console.warn("Interactive movement examples unavailable", e);
    });
  }
})();
