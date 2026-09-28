import { chapters, parseChapter } from "./content.js";

export const bookLanguages = {
  en: { name: "English", language: "Language", chapter: "Chapter", cover: "Cover", open: "Open book", previous: "Previous page", next: "Next page", back: "Back to cover", mark: "Mark chapter read", marked: "Chapter marked read", page: "Page", of: "of", loading: "Preparing the book…", retry: "Try again", end: "End of book", advisory: "Unabridged story · Spoilers, graphic violence, blood, mass death, and grief.", error: "The book could not be opened.", source: "English source", close: "Close book" },
  te: { name: "తెలుగు", language: "భాష", chapter: "అధ్యాయం", cover: "ముఖచిత్రం", open: "పుస్తకం తెరవండి", previous: "మునుపటి పేజీ", next: "తదుపరి పేజీ", back: "ముఖచిత్రానికి", mark: "చదివినట్లు గుర్తించండి", marked: "అధ్యాయం చదివారు", page: "పేజీ", of: "/", loading: "పుస్తకం సిద్ధమవుతోంది…", retry: "మళ్లీ ప్రయత్నించండి", end: "పుస్తకం ముగిసింది", advisory: "పూర్తి కథ · కథా రహస్యాలు, హింస, రక్తపాతం, సామూహిక మరణాలు, దుఃఖం. AI సహాయంతో అనువాదం; సంపాదక సమీక్ష అవసరం.", error: "పుస్తకాన్ని తెరవలేకపోయాము.", source: "ఆంగ్ల మూలం", close: "పుస్తకం మూసివేయండి" },
  hi: { name: "हिन्दी", language: "भाषा", chapter: "अध्याय", cover: "आवरण", open: "पुस्तक खोलें", previous: "पिछला पृष्ठ", next: "अगला पृष्ठ", back: "आवरण पर लौटें", mark: "पढ़ा हुआ चिह्नित करें", marked: "अध्याय पढ़ लिया", page: "पृष्ठ", of: "/", loading: "पुस्तक तैयार हो रही है…", retry: "फिर प्रयास करें", end: "पुस्तक समाप्त", advisory: "संपूर्ण कहानी · कथानक के रहस्य, हिंसा, रक्तपात, सामूहिक मृत्यु और शोक। AI-सहायित अनुवाद; संपादकीय समीक्षा आवश्यक।", error: "पुस्तक नहीं खुल सकी।", source: "अंग्रेज़ी मूल", close: "पुस्तक बंद करें" },
  es: { name: "Español", language: "Idioma", chapter: "Capítulo", cover: "Portada", open: "Abrir libro", previous: "Página anterior", next: "Página siguiente", back: "Volver a la portada", mark: "Marcar como leído", marked: "Capítulo leído", page: "Página", of: "de", loading: "Preparando el libro…", retry: "Reintentar", end: "Fin del libro", advisory: "Historia íntegra · Revelaciones, violencia gráfica, sangre, muerte masiva y duelo. Traducción asistida por IA; pendiente de revisión editorial.", error: "No se pudo abrir el libro.", source: "Original en inglés", close: "Cerrar libro" },
};

const viewLabels = {
  en: { enter: "Full screen", exit: "Exit full screen", fallback: "Full-page view is active. Browser full screen is unavailable here.", exitError: "Could not exit full screen. Try again or use your browser's Escape key." },
  te: { enter: "పూర్తి తెర", exit: "పూర్తి తెర మూసివేయండి", fallback: "పూర్తి పేజీ వీక్షణ ప్రారంభమైంది. ఇక్కడ బ్రౌజర్ పూర్తి తెర అందుబాటులో లేదు.", exitError: "పూర్తి తెర నుండి బయటకు రాలేకపోయాము. మళ్లీ ప్రయత్నించండి లేదా Escape నొక్కండి." },
  hi: { enter: "पूर्ण स्क्रीन", exit: "पूर्ण स्क्रीन से बाहर", fallback: "पूरा पृष्ठ खुला है। यहाँ ब्राउज़र की पूर्ण स्क्रीन उपलब्ध नहीं है।", exitError: "पूर्ण स्क्रीन से बाहर नहीं आ सके। फिर प्रयास करें या Escape दबाएँ।" },
  es: { enter: "Pantalla completa", exit: "Salir de pantalla completa", fallback: "La vista de página completa está activa. El modo de pantalla completa no está disponible aquí.", exitError: "No se pudo salir de la pantalla completa. Reintenta o pulsa Escape en el navegador." },
};

export function validateEdition(value, language, originals) {
  if (!Object.hasOwn(bookLanguages, language) || !value || value.language !== language || value.title !== "JINX" ||
      typeof value.subtitle !== "string" || !value.subtitle.trim() || !Array.isArray(value.chapters) || value.chapters.length !== chapters.length) {
    throw new Error(`Invalid ${language} book edition.`);
  }
  value.chapters.forEach((chapter, index) => {
    if (!chapter || chapter.id !== chapters[index].id || typeof chapter.title !== "string" || !chapter.title.trim() ||
        typeof chapter.subtitle !== "string" || !Array.isArray(chapter.blocks) || chapter.blocks.length < 2) {
      throw new Error(`Invalid chapter ${index + 1} in the ${language} edition.`);
    }
    const original = originals?.chapters[index];
    if (original && chapter.blocks.length !== original.blocks.length) throw new Error(`Incomplete translation: ${chapter.id}.`);
    chapter.blocks.forEach((block, blockIndex) => {
      if (!block || !["context", "paragraph", "break"].includes(block.kind) || typeof block.text !== "string" || !block.text.trim() ||
          (block.kind === "break" && block.text !== "***") || (original && block.kind !== original.blocks[blockIndex].kind)) {
        throw new Error(`Invalid paragraph ${blockIndex + 1} in ${chapter.id}.`);
      }
    });
  });
  return value;
}

export function pageForAnchor(pages, anchor) {
  let result = 0;
  pages.forEach((page, index) => {
    const start = page.segments[0];
    if (start && (start.block < anchor.block || (start.block === anchor.block && start.offset <= anchor.offset))) result = index;
  });
  return result;
}

function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

const editionCache = new Map();
async function responseAt(path, signal) {
  const response = await fetch(new URL(path, document.baseURI), { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
  return response;
}

async function loadEdition(language, signal) {
  if (editionCache.has(language)) return editionCache.get(language);
  let edition;
  if (language === "en") {
    const content = await Promise.all(chapters.map(async (chapter) => {
      const response = await responseAt(chapter.path, signal);
      return { ...chapter, blocks: parseChapter(await response.text(), chapter).blocks };
    }));
    edition = validateEdition({ language, title: "JINX", subtitle: "A Rajesh Kodaganti's Migration", chapters: content }, language);
  } else {
    const [originals, response] = await Promise.all([
      loadEdition("en", signal),
      responseAt(`assets/books/${language}.json`, signal),
    ]);
    edition = validateEdition(await response.json(), language, originals);
  }
  editionCache.set(language, edition);
  return edition;
}

export function createBookReader(callbacks) {
  return new BookReader(callbacks);
}

class BookReader {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.$ = (id) => document.getElementById(id);
    this.dialog = this.$("reader");
    this.viewport = this.$("reader-viewport");
    this.book = this.$("book");
    this.surface = this.$("book-page");
    this.measure = this.$("book-measure");
    this.language = "en";
    this.chapterIndex = 0;
    this.pageIndex = -1;
    this.pages = [];
    this.size = 18;
    this.ready = false;
    this.turning = false;
    this.generation = 0;
    this.returnFocus = null;
    this.pendingResize = false;
    this.reflowAnchor = null;
    this.storageAvailable = true;
    this.fullPage = false;
    this.ownsFullscreen = false;
    this.fullscreenBusy = false;
    this.viewNotice = null;
    try {
      const saved = localStorage.getItem("jinx-book-language");
      if (saved !== null && !Object.hasOwn(bookLanguages, saved)) {
        callbacks.onError("The saved book language was invalid and has been reset to English.");
        localStorage.removeItem("jinx-book-language");
      } else if (saved) this.language = saved;
    } catch (error) { this.storageError(error); }
    this.$("book-language").value = this.language;
    this.$("close-reader").addEventListener("click", () => this.close());
    this.dialog.addEventListener("cancel", (event) => { event.preventDefault(); this.escape(); });
    this.$("book-fullscreen").addEventListener("click", () => this.toggleFullscreen());
    document.addEventListener("fullscreenchange", () => {
      if (this.ownsFullscreen && document.fullscreenElement !== this.viewport) {
        this.ownsFullscreen = false;
        this.setFullPage(false);
      }
    });
    this.dialog.addEventListener("close", () => {
      document.body.classList.remove("reader-open");
      if (this.returnFocus instanceof HTMLElement && this.returnFocus.isConnected) this.returnFocus.focus();
    });
    this.$("next-page").addEventListener("click", () => this.move(1));
    this.$("previous-page").addEventListener("click", () => this.move(-1));
    this.$("book-cover").addEventListener("click", () => this.goToCover());
    this.$("book-language").addEventListener("change", () => {
      const anchor = this.anchor();
      this.language = this.$("book-language").value;
      try { if (this.storageAvailable) localStorage.setItem("jinx-book-language", this.language); }
      catch (error) { this.storageError(error); }
      this.prepare({ cover: this.pageIndex < 0, anchor, animate: true });
    });
    this.$("reader-chapter").addEventListener("change", () => {
      const index = Number(this.$("reader-chapter").value);
      if (index === -1) this.goToCover();
      else this.changeChapter(index);
    });
    this.$("mark-read").addEventListener("click", () => {
      if (this.ready && this.pageIndex >= 0) {
        callbacks.onMarkRead(this.chapterIndex);
        this.refreshProgress();
      }
    });
    this.$("smaller-text").addEventListener("click", () => this.setSize(this.size - 1));
    this.$("larger-text").addEventListener("click", () => this.setSize(this.size + 1));
    this.dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.escape(); return; }
      if (event.target.closest("select, input, textarea, a, button")) return;
      if (["ArrowRight", "PageDown", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        this.move(["ArrowRight", "PageDown"].includes(event.key) ? 1 : -1);
      }
    });
    let touch = null;
    this.book.addEventListener("touchstart", (event) => {
      touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    this.book.addEventListener("touchend", (event) => {
      if (!touch || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touch.x;
      const dy = event.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) this.move(dx < 0 ? 1 : -1);
    }, { passive: true });
    this.book.addEventListener("touchcancel", () => { touch = null; }, { passive: true });
    this.observer = new ResizeObserver(() => {
      if (!this.dialog.open || !this.ready) return;
      const geometry = `${this.book.clientWidth}:${this.book.clientHeight}`;
      if (geometry === this.geometry) return;
      if (this.turning) { this.pendingResize = true; return; }
      this.repaginate();
    });
    this.observer.observe(this.book);
    this.labels();
  }

  get text() { return bookLanguages[this.language]; }

  syncViewControls() {
    const labels = viewLabels[this.language];
    this.$("book-fullscreen-label").textContent = this.fullPage ? labels.exit : labels.enter;
    this.$("book-fullscreen").setAttribute("aria-label", this.fullPage ? labels.exit : labels.enter);
    this.$("book-fullscreen").setAttribute("aria-pressed", String(this.fullPage));
    this.$("book-fullscreen").disabled = this.fullscreenBusy || this.turning;
    this.$("close-reader").disabled = this.fullscreenBusy;
    this.$("book-view-status").textContent = this.viewNotice ? labels[this.viewNotice] : "";
    this.$("book-view-status").hidden = !this.viewNotice;
  }

  setFullPage(value) {
    this.fullPage = value;
    this.dialog.classList.toggle("reader-full-page", value);
    if (!value) this.viewNotice = null;
    this.syncViewControls();
    if (this.turning) this.pendingResize = true;
    else this.repaginate();
  }

  async toggleFullscreen() {
    if (this.fullscreenBusy || this.turning || !this.dialog.open) return;
    if (this.fullPage) { await this.exitFullscreen(); return; }
    this.fullscreenBusy = true;
    this.viewNotice = null;
    this.setFullPage(true);
    try {
      if (document.fullscreenElement) return;
      if (!document.fullscreenEnabled || !this.viewport.requestFullscreen) {
        this.viewNotice = "fallback";
        return;
      }
      await this.viewport.requestFullscreen();
      this.ownsFullscreen = true;
    } catch (error) {
      console.warn("Browser full screen was unavailable; keeping the expanded reader:", error);
      this.viewNotice = "fallback";
    } finally {
      this.fullscreenBusy = false;
      this.syncViewControls();
    }
  }

  async exitFullscreen() {
    if (this.fullscreenBusy) return false;
    this.fullscreenBusy = true;
    this.syncViewControls();
    try {
      if (this.ownsFullscreen && document.fullscreenElement === this.viewport) await document.exitFullscreen();
      this.ownsFullscreen = false;
      this.setFullPage(false);
      return true;
    } catch (error) {
      console.error("Could not exit book full screen:", error);
      this.viewNotice = "exitError";
      return false;
    } finally {
      this.fullscreenBusy = false;
      this.syncViewControls();
    }
  }

  escape() {
    if (this.fullscreenBusy) return;
    if (this.fullPage) this.exitFullscreen();
    else this.close();
  }

  storageError(error) {
    if (!(error instanceof DOMException) || !["SecurityError", "QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(error.name)) throw error;
    this.storageAvailable = false;
    this.callbacks.onError("This browser cannot save your book language. Your selection will last for this page session.");
  }

  labels() {
    const t = this.text;
    this.dialog.lang = this.language;
    this.book.lang = this.language;
    this.$("book-language-label").textContent = t.language;
    this.$("book-chapter-label").textContent = t.chapter;
    this.$("book-cover").textContent = t.back;
    this.$("reader-advisory").textContent = t.advisory;
    this.$("close-reader").setAttribute("aria-label", t.close);
    this.$("chapter-source").textContent = `${t.source} ↗`;
    for (const format of ["epub", "pdf"]) {
      const link = this.$(`download-${format}`);
      link.href = new URL(`assets/books/jinx-${this.language}.${format}`, document.baseURI).href;
      link.download = `JINX-${this.language}.${format}`;
      link.setAttribute("aria-label", `${format.toUpperCase()} · ${t.name}`);
    }
    this.$("reader-title").textContent = this.edition?.language === this.language ? this.edition.subtitle : "JINX";
    this.refreshProgress();
    this.syncViewControls();
  }

  open({ chapterIndex = 0, cover = true } = {}) {
    if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= chapters.length) throw new RangeError("Invalid chapter index.");
    this.chapterIndex = chapterIndex;
    this.pageIndex = cover ? -1 : 0;
    if (!this.dialog.open) {
      this.returnFocus = document.activeElement;
      this.dialog.showModal();
      document.body.classList.add("reader-open");
      document.dispatchEvent(new Event("jinx:reader-open"));
      this.$("close-reader").focus();
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.dialog.animate(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [
        { opacity: 0, transform: "perspective(1800px) rotateY(-12deg) scale(.94)" },
        { opacity: 1, transform: "perspective(1800px) rotateY(0deg) scale(1)" },
      ], { duration: reduced ? 100 : 450, easing: "ease-out" });
    }
    this.prepare({ cover, restore: true });
  }

  async close() {
    if (this.fullscreenBusy) return;
    if (this.fullPage && !(await this.exitFullscreen())) return;
    this.generation++;
    this.controller?.abort();
    this.animation?.cancel();
    this.ready = false;
    this.dialog.close();
  }

  async prepare({ cover = false, anchor = null, restore = false, animate = false } = {}) {
    const outgoing = animate ? this.surface.cloneNode(true) : null;
    this.reflowAnchor = null;
    const generation = ++this.generation;
    this.controller?.abort();
    this.animation?.cancel();
    this.controller = new AbortController();
    this.ready = false;
    this.labels();
    this.$("reader-state").textContent = this.text.loading;
    this.book.setAttribute("aria-busy", "true");
    this.updateControls();
    if (cover) this.drawCover(this.surface);
    else this.surface.replaceChildren();
    try {
      const edition = await loadEdition(this.language, this.controller.signal);
      const family = { te: "Jinx Telugu", hi: "Jinx Devanagari" }[this.language];
      if (family) {
        const fonts = await document.fonts.load(`${this.size}px "${family}"`, this.text.name);
        if (!fonts.length) throw new Error(`The ${family} font is missing. Please retry after the book assets finish loading.`);
      }
      if (generation !== this.generation || !this.dialog.open) return;
      this.edition = edition;
      this.labels();
      this.$("reader-chapter").replaceChildren(...[
        { value: -1, title: this.text.cover },
        ...edition.chapters.map((chapter, index) => ({ value: index, title: `${chapters[index].number} · ${chapter.title}` })),
      ].map(({ value, title }) => { const option = node("option", "", title); option.value = String(value); return option; }));
      this.$("reader-state").replaceChildren();
      this.paginate();
      let target = 0;
      if (anchor) target = pageForAnchor(this.pages, anchor);
      else if (restore) {
        const ratio = this.callbacks.getProgress().positions[chapters[this.chapterIndex].id] ?? 0;
        target = Math.min(this.pages.length - 1, Math.round(ratio * Math.max(0, this.pages.length - 1)));
      }
      this.resumePage = target;
      this.ready = true;
      if (animate && !cover) await this.turnTo(target, 1, outgoing);
      else { this.pageIndex = cover ? -1 : target; this.render(); }
    } catch (error) {
      if (generation !== this.generation || this.controller.signal.aborted) return;
      this.fail(error, () => this.prepare({ cover, anchor, restore }));
    } finally {
      if (generation === this.generation) {
        this.book.setAttribute("aria-busy", "false");
        this.updateControls();
      }
    }
  }

  fail(error, retry) {
    console.error(`Could not prepare ${this.language} book:`, error);
    this.ready = false;
    const message = node("div", "error-message", `${this.text.error} ${error.message}`);
    const button = node("button", "retry-button", this.text.retry);
    button.type = "button";
    button.addEventListener("click", retry);
    message.append(button);
    this.$("reader-state").replaceChildren(message);
    this.book.setAttribute("aria-busy", "false");
    this.updateControls();
  }

  makeText(page) {
    const content = node("div", "book-page-text");
    if (page.heading) content.append(node("h3", "", page.heading));
    if (page.subheading) content.append(node("p", "book-chapter-subtitle", page.subheading));
    for (const segment of page.segments) {
      const part = segment.kind === "break" ? node("hr") : node("p", segment.kind === "context" ? "source-context" : "", segment.text);
      part.dataset.block = String(segment.block);
      part.dataset.offset = String(segment.offset);
      content.append(part);
    }
    return content;
  }

  paginate() {
    const chapter = this.edition.chapters[this.chapterIndex];
    const pages = [];
    let page = { heading: chapter.title, subheading: chapter.subtitle, segments: [] };
    let content = this.makeText(page);
    this.measure.replaceChildren(content);
    const fits = () => content.scrollHeight <= content.clientHeight + 1;
    if (content.clientHeight < 35) throw new Error("There is not enough room for a book page. Enlarge the window or rotate your device.");
    const finish = () => {
      if (page.segments.length || page.heading) pages.push(page);
      page = { heading: "", segments: [] };
      content = this.makeText(page);
      this.measure.replaceChildren(content);
    };
    const segmenter = new Intl.Segmenter(this.language, { granularity: "word" });
    chapter.blocks.forEach((block, blockIndex) => {
      if (block.kind === "break") {
        const rule = node("hr");
        content.append(rule);
        if (!fits()) { rule.remove(); finish(); content.append(rule); }
        page.segments.push({ ...block, block: blockIndex, offset: 0 });
        return;
      }
      let offset = 0;
      while (offset < block.text.length) {
        const rest = block.text.slice(offset);
        const paragraph = node("p", block.kind === "context" ? "source-context" : "", rest);
        content.append(paragraph);
        if (fits()) {
          page.segments.push({ kind: block.kind, text: rest, block: blockIndex, offset });
          break;
        }
        const ends = [...segmenter.segment(rest)].map((part) => part.index + part.segment.length);
        let low = 0;
        let high = ends.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          paragraph.textContent = rest.slice(0, ends[middle - 1]);
          if (fits()) low = middle;
          else high = middle - 1;
        }
        if (!low) {
          paragraph.remove();
          if (!page.segments.length && !page.heading) throw new Error("Text cannot fit on this page. Reduce the text size or enlarge the window.");
          finish();
          continue;
        }
        const length = ends[low - 1];
        const text = rest.slice(0, length);
        paragraph.textContent = text;
        page.segments.push({ kind: block.kind, text, block: blockIndex, offset });
        offset += length;
        finish();
      }
    });
    if (page.segments.length || page.heading) pages.push(page);
    this.pages = pages;
    this.geometry = `${this.book.clientWidth}:${this.book.clientHeight}`;
    this.measure.replaceChildren();
  }

  anchor() {
    if (this.reflowAnchor) return this.reflowAnchor;
    const start = this.pages[this.pageIndex < 0 ? this.resumePage ?? 0 : this.pageIndex]?.segments[0];
    return start ? { block: start.block, offset: start.offset } : { block: 0, offset: 0 };
  }

  repaginate() {
    if (!this.ready || !this.dialog.open) return;
    const cover = this.pageIndex < 0;
    const start = cover ? this.pages[this.resumePage ?? 0]?.segments[0] : null;
    const anchor = this.reflowAnchor ?? (start ? { block: start.block, offset: start.offset } : this.anchor());
    try {
      this.paginate();
      const target = pageForAnchor(this.pages, anchor);
      if (cover) this.resumePage = target;
      this.pageIndex = cover ? -1 : target;
      this.reflowAnchor = anchor;
      this.render();
    } catch (error) { this.fail(error, () => this.prepare({ cover, anchor })); }
  }

  setSize(size) {
    if (!this.ready || this.turning) return;
    this.size = Math.max(15, Math.min(25, size));
    this.book.style.setProperty("--book-size", `${this.size}px`);
    this.repaginate();
  }

  drawCover(surface) {
    surface.classList.add("cover-page");
    const button = node("button", "book-cover-open");
    button.type = "button";
    button.setAttribute("aria-label", this.text.open);
    button.disabled = !this.ready || this.turning;
    const image = node("img");
    image.src = new URL("assets/jinx-book-cover.png", document.baseURI).href;
    image.alt = "JINX - A Rajesh Kodaganti's Migration";
    image.width = 1600;
    image.height = 2400;
    button.append(image);
    button.addEventListener("click", () => this.move(1));
    surface.replaceChildren(button);
  }

  drawPage(surface, index) {
    if (index < 0) { this.drawCover(surface); return; }
    surface.classList.remove("cover-page");
    const chapter = this.edition.chapters[this.chapterIndex];
    const running = node("div", "book-running-title", `JINX / ${chapter.title}`);
    const folio = node("div", "book-folio");
    folio.append(node("span", "", chapters[this.chapterIndex].number), node("span", "", `${index + 1} / ${this.pages.length}`));
    surface.replaceChildren(running, this.makeText(this.pages[index]), folio);
  }

  render() {
    this.drawPage(this.surface, this.pageIndex);
    this.$("reader-chapter").value = String(this.pageIndex < 0 ? -1 : this.chapterIndex);
    this.$("reader-number").textContent = this.pageIndex < 0 ? `JINX / ${this.text.name}` : `${chapters[this.chapterIndex].number} / ${this.edition.chapters[this.chapterIndex].title}`;
    this.$("chapter-source").href = new URL(chapters[this.chapterIndex].path, document.baseURI).href;
    if (this.pageIndex >= 0) {
      this.callbacks.onPosition(this.chapterIndex, this.pages.length > 1 ? this.pageIndex / (this.pages.length - 1) : 0);
    }
    this.updateControls();
  }

  refreshProgress() {
    const read = this.callbacks.getProgress().read.includes(chapters[this.chapterIndex].id);
    this.$("mark-read").textContent = read ? `${this.text.marked} ✓` : this.text.mark;
  }

  updateControls() {
    this.syncViewControls();
    const busy = !this.ready || this.turning;
    const last = this.chapterIndex === chapters.length - 1 && this.pageIndex === this.pages.length - 1;
    this.$("previous-page").disabled = busy || this.pageIndex < 0;
    this.$("next-page").disabled = busy || last;
    this.$("previous-page").textContent = `← ${this.text.previous}`;
    this.$("next-page").textContent = this.pageIndex < 0 ? `${this.text.open} →` : last ? this.text.end : `${this.text.next} →`;
    this.$("reader-position").textContent = this.pageIndex < 0 ? this.text.cover : this.pages.length ? `${this.text.page} ${this.pageIndex + 1} ${this.text.of} ${this.pages.length}` : "";
    this.$("mark-read").disabled = busy || this.pageIndex < 0;
    this.$("book-cover").disabled = busy || this.pageIndex < 0;
    this.$("reader-chapter").disabled = busy;
    this.$("book-language").disabled = this.turning;
    this.$("smaller-text").disabled = busy || this.size <= 15;
    this.$("larger-text").disabled = busy || this.size >= 25;
    const cover = this.surface.querySelector(".book-cover-open");
    if (cover) cover.disabled = busy;
    this.refreshProgress();
  }

  async turnTo(target, direction, outgoing = null) {
    if (this.turning || !this.ready) return;
    const generation = this.generation;
    const leaf = node("div", "book-leaf");
    leaf.setAttribute("aria-hidden", "true");
    leaf.inert = true;
    const front = node("div", "book-page");
    if (direction > 0) {
      const old = outgoing ?? this.surface;
      front.className = old.className;
      front.replaceChildren(...[...old.childNodes].map((child) => child.cloneNode(true)));
      this.drawPage(this.surface, target);
    } else this.drawPage(front, target);
    leaf.append(front, node("div", "book-leaf-back"));
    this.book.append(leaf);
    this.turning = true;
    this.book.dataset.turning = direction > 0 ? "forward" : "backward";
    this.updateControls();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frames = reduced ? [{ opacity: direction > 0 ? 1 : 0 }, { opacity: direction > 0 ? 0 : 1 }] :
      direction > 0 ? [
        { transform: "rotateY(0deg)", opacity: 1, offset: 0 },
        { transform: "rotateY(-95deg)", opacity: 1, offset: .6 },
        { transform: "rotateY(-175deg)", opacity: 0, offset: 1 },
      ] : [
        { transform: "rotateY(-175deg)", opacity: 0, offset: 0 },
        { transform: "rotateY(-95deg)", opacity: 1, offset: .4 },
        { transform: "rotateY(0deg)", opacity: 1, offset: 1 },
      ];
    this.animation = leaf.animate(frames, { duration: reduced ? 120 : 720, easing: "cubic-bezier(.25,.65,.3,1)", fill: "forwards" });
    try {
      await this.animation.finished;
      if (generation !== this.generation || !this.dialog.open) return;
      this.pageIndex = target;
      this.reflowAnchor = null;
      this.render();
      this.book.focus({ preventScroll: true });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "AbortError") throw error;
    } finally {
      leaf.remove();
      this.turning = false;
      delete this.book.dataset.turning;
      this.updateControls();
      if (this.pendingResize) { this.pendingResize = false; this.repaginate(); }
    }
  }

  async changeChapter(index, { end = false, direction = 1 } = {}) {
    if (!this.ready || this.turning || !Number.isInteger(index) || index < 0 || index >= chapters.length) return;
    const outgoing = this.surface.cloneNode(true);
    this.chapterIndex = index;
    try {
      this.paginate();
      await this.turnTo(end ? this.pages.length - 1 : 0, direction, outgoing);
    } catch (error) { this.fail(error, () => this.prepare()); }
  }

  move(direction) {
    if (!this.ready || this.turning) return;
    if (this.pageIndex < 0) { if (direction > 0) this.turnTo(Math.min(this.resumePage ?? 0, this.pages.length - 1), 1); return; }
    const target = this.pageIndex + direction;
    if (target < 0) {
      if (this.chapterIndex > 0) this.changeChapter(this.chapterIndex - 1, { end: true, direction: -1 });
      else this.goToCover();
    } else if (target >= this.pages.length) {
      if (this.chapterIndex < chapters.length - 1) this.changeChapter(this.chapterIndex + 1);
    } else this.turnTo(target, direction);
  }

  goToCover() {
    if (!this.ready || this.turning || this.pageIndex < 0) return;
    this.resumePage = this.pageIndex;
    this.turnTo(-1, -1);
  }
}
