import { hasAccess, clearAccess, createCodePrompt } from "./jinxed-access.js";

const content = document.querySelector("#jinxed-content");
const status = document.querySelector("#archive-status");
const retry = document.querySelector("#retry-archive");
const sealed = document.querySelector("#sealed-archive");
const nav = document.querySelector("#jinxed-nav");
const lock = document.querySelector("#lock-archive");
const wordmark = document.querySelector("#archive-wordmark");
let loading = false;
let generation = 0;
let bookReader;
let videos;
let stopHero;

function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

function showError(message) {
  status.textContent = message;
  status.hidden = false;
}

function resetView() {
  generation++;
  loading = false;
  bookReader?.close();
  videos?.destroy();
  videos = null;
  stopHero?.();
  stopHero = null;
  content.hidden = true;
  content.replaceChildren();
  nav.hidden = true;
  lock.hidden = true;
  retry.hidden = true;
  status.hidden = true;
  sealed.hidden = false;
  wordmark.firstChild.textContent = "Archive";
  document.title = "Sealed archive";
}

function authorized() {
  try {
    return hasAccess();
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    showError("This browser cannot read the unlock for this tab. Allow session storage to open the archive.");
    return false;
  }
}

const prompt = createCodePrompt(loadArchive);
document.querySelector("#unlock-archive").addEventListener("click", (event) => prompt(event.currentTarget));
// Browsers cache a rejected module import for the lifetime of the document.
retry.addEventListener("click", () => window.location.reload());
lock.addEventListener("click", () => {
  try {
    clearAccess();
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    resetView();
    showError("The archive is hidden, but its saved unlock could not be removed. Close this tab to end the session.");
    return;
  }
  resetView();
  window.location.assign("./index.html");
});

async function loadArchive() {
  if (!authorized() || loading || content.childElementCount) return;
  loading = true;
  const currentGeneration = generation;
  retry.hidden = true;
  status.hidden = false;
  status.textContent = "Opening archive...";
  try {
    const [data, { setupJinxedBook }, { setupJinxedVideos }, { setupJinxedHero }] = await Promise.all([
      import("./jinxed-content.js"), import("./jinxed-book.js"),
      import("./jinxed-videos.js"), import("./jinxed-hero.js"),
    ]);
    if (currentGeneration !== generation || !authorized()) return;
    status.hidden = true;
    if (!bookReader) bookReader = setupJinxedBook(data.chapters, showError);
    renderArchive(data, setupJinxedVideos, setupJinxedHero);
    sealed.hidden = true;
    content.hidden = false;
    nav.hidden = false;
    lock.hidden = false;
    wordmark.firstChild.textContent = "JINXED";
    document.title = "JINXED - The ring remains";
    document.querySelector("#jinxed-title").focus({ preventScroll: true });
  } catch (error) {
    if (currentGeneration !== generation) return;
    console.error("JINXED archive could not be loaded:", error);
    resetView();
    showError("The archive could not be loaded. Check your connection and retry.");
    retry.hidden = false;
  } finally {
    if (currentGeneration === generation) loading = false;
  }
}

function renderArchive({ chapters, moments, references }, setupVideos, setupHero) {
  content.innerHTML = `
    <section class="section-shell jinxed-hero" aria-labelledby="jinxed-title">
      <div>
        <p class="eyebrow">Earth / 2181-2182 / A hidden continuation</p>
        <h1 id="jinxed-title" tabindex="-1">JINXED<span class="title-period">.</span></h1>
        <p class="hero-tagline">The world remains.<br>The sky remembers.</p>
        <p class="jinxed-intro">The Moon came closer. Then slower. Then apart. Beneath its broken light, Earth's survivors begin a new record.</p>
        <button class="button button-primary" id="begin-jinxed" type="button">Open the book</button>
        <p class="content-advisory">Disaster aftermath, loss, and uncertain survival. This archive contains its own story spoilers.</p>
      </div>
      <div id="jinxed-hero-art"></div>
    </section>
    <section class="section-shell section-space" id="chapters" aria-labelledby="chapters-title">
      <p class="eyebrow">01 / The Earth records</p>
      <h2 id="chapters-title">Two chapters.<br>One changed sky.</h2>
      <p class="muted">Read in English, Telugu, Hindi, or Spanish. Open the cover, turn the pages, and keep your place.</p>
      <div class="jinxed-chapters"></div>
    </section>
    <section class="jinxed-moments section-space" id="moments" aria-labelledby="moments-title">
      <div class="section-shell">
        <p class="eyebrow">02 / Key moments</p>
        <h2 id="moments-title">Approach. Breakup. Ring.</h2>
        <p class="muted">Three original short films from the Earth records. Stylized reconstructions, not to-scale orbital simulations.</p>
        <div id="jinxed-video-host"></div>
      </div>
    </section>
    <section class="section-shell section-space" id="references" aria-labelledby="references-title">
      <p class="eyebrow">03 / JINXED references</p>
      <h2 id="references-title">What the records establish.</h2>
      <p class="muted">Story notes for these two chapters only. These fictional records are not external scientific sources.</p>
      <div class="jinxed-references"></div>
    </section>
    <footer class="section-shell jinxed-footer"><p>JINXED / End of the first two records</p><a href="#main">Return to the sky</a></footer>`;

  function readChapter(index) {
    bookReader.open({ chapterIndex: index, cover: false });
  }
  content.querySelector("#begin-jinxed").addEventListener("click", () => bookReader.open({ cover: true }));
  chapters.forEach((chapter, index) => {
    const button = node("button", "chapter-card");
    button.type = "button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "reader");
    button.append(node("span", "tiny-label", "JINXED"), node("h3", "", chapter.title), node("p", "", chapter.teaser), node("span", "tiny-label", chapter.period));
    button.addEventListener("click", () => readChapter(index));
    content.querySelector(".jinxed-chapters").append(button);
  });
  videos = setupVideos(content.querySelector("#jinxed-video-host"), { moments, openChapter: readChapter });
  stopHero = setupHero(content.querySelector("#jinxed-hero-art"));
  references.forEach((reference) => {
    const card = node("article", "jinxed-reference");
    const link = node("button", "text-link", `Read ${chapters[reference.chapter].title}`);
    link.type = "button";
    link.addEventListener("click", () => readChapter(reference.chapter));
    card.append(node("h3", "", reference.title), node("p", "", reference.text), link);
    content.querySelector(".jinxed-references").append(card);
  });
}

// Recheck a restored history entry instead of trusting its previously unlocked DOM.
window.addEventListener("pageshow", () => {
  resetView();
  loadArchive();
});
window.addEventListener("pagehide", resetView);
