import { createBookReader, validateEdition } from "./book-reader.js";

export function setupJinxedBook(chapters, onError) {
  const storageKey = "jinxed-reading-v1";
  const ids = chapters.map(({ id }) => id);
  let progress = { read: [], positions: {} };
  let storageAvailable = true;
  function storageError(error) {
    if (!(error instanceof DOMException) || !["SecurityError", "QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(error.name)) throw error;
    storageAvailable = false;
    onError("This browser cannot save JINXED reading progress. Your place will last for this page session.");
  }
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      let record;
      try { record = JSON.parse(saved); }
      catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
      if (record && Array.isArray(record.read) && record.read.every((id) => ids.includes(id)) &&
          new Set(record.read).size === record.read.length && record.positions && !Array.isArray(record.positions) &&
          typeof record.positions === "object" &&
          Object.entries(record.positions).every(([id, ratio]) => ids.includes(id) && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1)) {
        progress = record;
      } else {
        onError("The saved JINXED reading record was invalid and has been reset.");
        localStorage.removeItem(storageKey);
      }
    }
  } catch (error) { storageError(error); }
  function save() {
    if (!storageAvailable) return;
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
    catch (error) { storageError(error); }
  }

  const dialog = document.createElement("dialog");
  dialog.id = "reader";
  dialog.className = "reader";
  dialog.setAttribute("aria-labelledby", "reader-title");
  dialog.setAttribute("aria-describedby", "reader-advisory");
  dialog.innerHTML = `
    <div class="reader-viewport" id="reader-viewport">
      <header class="reader-header">
        <div><span class="tiny-label" id="reader-number">The book / JINXED</span><h2 id="reader-title">The ring remains</h2></div>
        <div class="reader-window-controls">
          <button class="reader-fullscreen" id="book-fullscreen" type="button" aria-pressed="false" aria-controls="reader"><span id="book-fullscreen-label">Full screen</span></button>
          <button class="icon-button" id="close-reader" type="button" aria-label="Close book">X</button>
        </div>
      </header>
      <div class="reader-toolbar">
        <label><span id="book-language-label">Language</span><select id="book-language" aria-label="Book language"><option value="en" lang="en">English</option><option value="te" lang="te">తెలుగు</option><option value="hi" lang="hi">हिन्दी</option><option value="es" lang="es">Español</option></select></label>
        <label class="book-chapter-label"><span id="book-chapter-label">Chapter</span><select id="reader-chapter"></select></label>
        <div class="reader-text-controls" role="group" aria-label="Reading text size">
          <button type="button" id="smaller-text" aria-label="Decrease text size">A-</button><button type="button" id="larger-text" aria-label="Increase text size">A+</button>
        </div>
      </div>
      <p class="reader-advisory" id="reader-advisory"></p>
      <p class="book-view-status" id="book-view-status" role="status" hidden></p>
      <div id="reader-state" role="status" aria-live="polite"></div>
      <div class="book-stage" id="book-stage">
        <div class="book" id="book" tabindex="0" role="group" aria-label="JINXED book. Use the arrow keys or swipe to turn pages." aria-busy="false">
          <article class="book-page" id="book-page"></article>
          <div class="book-page book-measure" id="book-measure" aria-hidden="true" inert></div>
        </div>
      </div>
      <div class="book-reading-tools">
        <button class="text-link" id="book-cover" type="button">Back to cover</button>
        <button class="text-link" id="mark-read" type="button" disabled>Mark chapter read</button>
        <a id="chapter-source" hidden></a>
      </div>
      <footer class="reader-footer">
        <button class="text-link" id="previous-page" type="button" disabled>Previous page</button>
        <span id="reader-position" class="tiny-label" role="status" aria-live="polite"></span>
        <button class="text-link" id="next-page" type="button" disabled>Open book</button>
      </footer>
    </div>`;
  document.body.append(dialog);
  const edition = {
    language: "en", title: "JINXED", subtitle: "The ring remains",
    chapters: chapters.map((chapter, index) => ({
      ...chapter, number: String(index + 1).padStart(2, "0"), subtitle: "",
      blocks: [
        { kind: "context", text: chapter.period },
        ...chapter.paragraphs.map((text) => ({ kind: text === "***" ? "break" : "paragraph", text })),
      ],
    })),
  };
  const editions = new Map([["en", edition]]);
  async function loadEdition(language, signal) {
    if (editions.has(language)) return editions.get(language);
    const response = await fetch(new URL(`assets/books/jinxed-${language}.json`, document.baseURI), { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: JINXED ${language} edition`);
    const translated = validateEdition(await response.json(), language, edition, { chapterMetadata: chapters, title: "JINXED" });
    editions.set(language, translated);
    return translated;
  }
  const reader = createBookReader({
    getProgress: () => progress,
    onError,
    onPosition(index, ratio) { progress.positions[ids[index]] = ratio; save(); },
    onMarkRead(index) { if (!progress.read.includes(ids[index])) progress.read.push(ids[index]); save(); },
  }, {
    chapters: edition.chapters,
    title: edition.title,
    loadEdition,
    cover: { path: "assets/jinxed-book-cover.svg", alt: "JINXED - The ring remains. Chapters 1 and 2." },
    advisory: {
      en: "JINXED / Complete chapters 1 and 2 / Disaster aftermath, loss, and uncertain survival.",
      te: "JINXED / పూర్తి అధ్యాయాలు 1 మరియు 2 / విపత్తు అనంతర పరిణామాలు, నష్టం, అనిశ్చిత మనుగడ. AI సహాయంతో అనువాదం; సంపాదక సమీక్ష అవసరం.",
      hi: "JINXED / संपूर्ण अध्याय 1 और 2 / आपदा के परिणाम, हानि और अनिश्चित अस्तित्व। AI-सहायित अनुवाद; संपादकीय समीक्षा आवश्यक।",
      es: "JINXED / Capítulos 1 y 2 completos / Secuelas del desastre, pérdida y supervivencia incierta. Traducción asistida por IA; pendiente de revisión editorial.",
    },
    languageStorageKey: "jinxed-book-language",
    downloads: false,
  });
  return reader;
}
