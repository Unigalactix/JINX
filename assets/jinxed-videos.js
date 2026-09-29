const films = ["approach", "breakup", "ring"].map((name) => ({
  video: new URL(`./jinxed-videos/${name}.webm`, import.meta.url).href,
  poster: new URL(`./jinxed-videos/${name}.png`, import.meta.url).href,
  captions: new URL(`./jinxed-videos/${name}.vtt`, import.meta.url).href,
}));

export function setupJinxedVideos(container, { moments, openChapter }) {
  if (!container || moments?.length !== films.length || typeof openChapter !== "function") {
    throw new TypeError("JINXED videos require a container, three moments, and an openChapter callback.");
  }
  const document = container.ownerDocument;
  const events = new AbortController();
  const root = document.createElement("div");
  root.className = "jinxed-video-experience";
  root.innerHTML = `
    <p class="jinxed-video-kicker">Recovered motion archive</p>
    <p class="jinxed-video-note">Original silent story films · fictional reconstructions, not scientific simulations.
      Distances are illustrative; the ring sequence compresses years. Nothing plays automatically.</p>
    <div class="jinxed-video-scenes" role="group" aria-label="Choose a JINXED film"></div>
    <figure class="jinxed-video-figure">
      <video class="jinxed-video-player" controls playsinline preload="metadata"
        aria-label="JINXED story film">
        Your browser does not support this video. Use the download link below.
      </video>
      <figcaption>
        <p class="jinxed-video-period"></p>
        <h3 class="jinxed-video-title"></h3>
        <p class="jinxed-video-description"></p>
      </figcaption>
    </figure>
    <p class="jinxed-video-status" role="status" aria-live="polite"></p>
    <div class="jinxed-video-actions">
      <button class="jinxed-video-chapter" type="button"></button>
      <a class="jinxed-video-download" download>Download this film (WebM)</a>
    </div>
    <p class="jinxed-video-note">Use the video’s play, pause, timeline and fullscreen controls.
      English captions are available in the video controls; a scene description is always shown below.</p>`;
  const find = (selector) => root.querySelector(selector);
  const video = find("video");
  const status = find(".jinxed-video-status");
  const chapterButton = find(".jinxed-video-chapter");
  const scenes = find(".jinxed-video-scenes");
  let selected = 0;
  let destroyed = false;
  const on = (target, name, handler) => target.addEventListener(name, handler, { signal: events.signal });
  const pause = () => video.pause();

  const buttons = moments.map((moment, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "jinxed-video-scene";
    button.textContent = `${String(index + 1).padStart(2, "0")} / ${moment.title}`;
    button.setAttribute("aria-pressed", "false");
    on(button, "click", () => select(index));
    scenes.append(button);
    return button;
  });

  function select(index) {
    if (destroyed) return;
    pause();
    selected = index;
    const moment = moments[index];
    const film = films[index];
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(index === i)));
    find(".jinxed-video-title").textContent = moment.title;
    find(".jinxed-video-period").textContent = moment.period;
    find(".jinxed-video-description").textContent = moment.description;
    chapterButton.textContent = `Read Chapter ${moment.chapter + 1}`;
    find(".jinxed-video-download").href = film.video;
    status.textContent = "";
    video.setAttribute("aria-label", `${moment.title} — silent JINXED story film`);
    video.poster = film.poster;
    const track = document.createElement("track");
    track.kind = "captions";
    track.label = "English — scene description";
    track.srclang = "en";
    track.src = film.captions;
    video.replaceChildren(track);
    video.src = film.video;
    video.load();
  }

  on(chapterButton, "click", () => {
    pause();
    openChapter(moments[selected].chapter);
  });
  on(video, "error", () => {
    status.textContent = "This film could not be played. Try downloading the WebM, or read its chapter below.";
  });
  on(document, "visibilitychange", () => {
    if (document.hidden) pause();
  });
  on(document, "jinx:reader-open", pause);
  on(document.defaultView, "pagehide", pause);
  const Observer = document.defaultView.IntersectionObserver;
  const observer = Observer ? new Observer((entries) => {
    if (entries.some((entry) => !entry.isIntersecting)) pause();
  }) : null;
  container.replaceChildren(root);
  observer?.observe(video);
  select(0);

  return {
    pause,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      events.abort();
      observer?.disconnect();
      pause();
      video.removeAttribute("src");
      video.replaceChildren();
      video.load();
      root.remove();
    },
  };
}
