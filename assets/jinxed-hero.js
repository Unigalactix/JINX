export function setupJinxedHero(host) {
  const orbit = `<g transform="translate(250 250) scale(1 .34)">
    <g class="ring-spin">
      <circle r="224" fill="none" stroke="#9f9277" stroke-width="19" opacity=".35"/>
      <circle r="216" fill="none" stroke="#e4d2a7" stroke-width="4" stroke-dasharray="90 8 28 5 55 12" opacity=".9"/>
      <circle r="229" fill="none" stroke="#c2b38e" stroke-width="3" stroke-dasharray="35 5 4 9 100 5"/>
      <circle r="220" fill="none" stroke="#887d66" stroke-width="2" stroke-dasharray="25 17 60 4"/>
      <circle cx="224" cy="0" r="5" fill="#f1e3c5"/><circle cx="-110" cy="193" r="4" fill="#decba5"/>
      <circle cx="10" cy="-225" r="3" fill="#fff0cb"/>
    </g>
  </g>`;
  host.innerHTML = `
    <div class="ring-world" id="rotating-earth" role="img" aria-label="A rotating blue Earth with green continents, white clouds and polar ice, encircled by orbiting lunar debris.">
      <svg class="hero-orbits" viewBox="0 0 500 500" aria-hidden="true">
        <g transform="rotate(-28 250 250)">${orbit}</g>
      </svg>
      <div class="ring-earth" aria-hidden="true">
        <div class="earth-surface"></div>
        <div class="earth-clouds"></div>
        <div class="earth-shade"></div>
      </div>
      <svg class="hero-orbits hero-orbits-front" viewBox="0 0 500 500" aria-hidden="true">
        <defs><clipPath id="front-ring-half"><rect x="0" y="250" width="500" height="250"/></clipPath></defs>
        <g transform="rotate(-28 250 250)"><g clip-path="url(#front-ring-half)">${orbit}</g></g>
      </svg>
    </div>
    <div class="hero-motion-control"><span class="tiny-label">Earth / The lunar ring</span><button class="text-link" id="hero-motion" type="button" aria-controls="rotating-earth" aria-pressed="false">Pause rotation</button></div>`;
  const world = host.querySelector(".ring-world");
  const button = host.querySelector("#hero-motion");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reduced.matches;
  function update() {
    world.classList.toggle("is-paused", paused || document.hidden);
    button.textContent = paused ? "Play rotation" : "Pause rotation";
    button.setAttribute("aria-pressed", String(paused));
  }
  button.addEventListener("click", () => { paused = !paused; update(); });
  function preference() { paused = reduced.matches; update(); }
  reduced.addEventListener("change", preference);
  document.addEventListener("visibilitychange", update);
  update();
  return () => {
    reduced.removeEventListener("change", preference);
    document.removeEventListener("visibilitychange", update);
  };
}
