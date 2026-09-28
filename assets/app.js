import { chapters, characters, groups, identities, fleet, timeline, parseCharts, parseChapter, initialProgress, validProgress } from "./content.js";

const $ = (selector) => document.querySelector(selector);
const storageKey = "jinx-reading-v1";
const cache = new Map();
let spoilers = false;
let selectedCharacter = "egon";
let characterGroup = "all";
let selectedFleet = "mercy";
let selectedYear = "2165";
let chartFamily = "emotions";
let chartMetric = 0;
let chartChapter = 0;
let chartData = null;
let readerIndex = 0;
let readerLoaded = false;
let readerRequest = null;
let progressTimer = null;
let readingSize = 19;
let storageAvailable = true;
let returnFocus = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function notice(message) {
  $("#site-notice").textContent = message;
  $("#site-notice").hidden = false;
}

function storageFailure(error) {
  if (!(error instanceof DOMException) || !["SecurityError", "QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(error.name)) {
    throw error;
  }
  storageAvailable = false;
  notice("This browser cannot save reading progress. You can keep reading, but your place will only last for this page session.");
}

function resetStoredProgress(message) {
  const fresh = initialProgress();
  notice(message);
  try { localStorage.setItem(storageKey, JSON.stringify(fresh)); }
  catch (error) { storageFailure(error); }
  return fresh;
}

function loadProgress() {
  let raw;
  try { raw = localStorage.getItem(storageKey); }
  catch (error) { storageFailure(error); return initialProgress(); }
  if (raw === null) return initialProgress();
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return resetStoredProgress("The saved reading record could not be read and has been reset. The story files are unchanged.");
  }
  if (!validProgress(parsed)) {
    return resetStoredProgress("The saved reading record was invalid or from another version and has been reset. The story files are unchanged.");
  }
  return parsed;
}

let progress = loadProgress();

function persistProgress() {
  if (!storageAvailable) return;
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
  catch (error) { storageFailure(error); }
}

function chapterURL(chapter) {
  return new URL(chapter.path, document.baseURI);
}

function renderProgress() {
  $("#reading-progress").textContent = `${progress.read.length} / ${chapters.length} chapters marked read`;
  for (const button of document.querySelectorAll(".chapter-card")) {
    const read = progress.read.includes(button.dataset.chapter);
    button.classList.toggle("is-read", read);
    const chapter = chapters.find((item) => item.id === button.dataset.chapter);
    button.setAttribute("aria-label", `Read ${chapter.title}${read ? ", marked read" : ""}`);
  }
  const last = chapters.find((chapter) => chapter.id === progress.last);
  $("#begin-reading").replaceChildren(
    document.createTextNode(last ? `Continue: ${last.title} ` : "Begin the story "),
    element("span", "", "↗"),
  );
  $("#begin-reading span").setAttribute("aria-hidden", "true");
  $("#reset-progress").disabled = progress.last === null && progress.read.length === 0;
  $("#mark-read").textContent = progress.read.includes(chapters[readerIndex].id) ? "Chapter marked read ✓" : "Mark chapter read";
}

function renderChapters() {
  const fragment = document.createDocumentFragment();
  const options = document.createDocumentFragment();
  chapters.forEach((chapter, index) => {
    const button = element("button", "chapter-card");
    button.type = "button";
    button.dataset.chapter = chapter.id;
    button.append(element("span", "chapter-number", `${chapter.number} / ${index === 0 ? "PROLOGUE" : index === 7 ? "EPILOGUE" : "CHAPTER"}`));
    const arrow = element("span", "chapter-arrow", "↗");
    arrow.setAttribute("aria-hidden", "true");
    button.append(arrow, element("h3", "", chapter.title), element("p", "", chapter.teaser), element("span", "chapter-period", chapter.period));
    button.addEventListener("click", () => openChapter(index));
    fragment.append(button);
    const option = element("option", "", `${chapter.number} · ${chapter.title}`);
    option.value = String(index);
    options.append(option);
  });
  $("#chapter-grid").replaceChildren(fragment);
  $("#reader-chapter").replaceChildren(options);
  $("#begin-reading").disabled = false;
  $("#closing-read").disabled = false;
  renderProgress();
}

function renderFleet() {
  const buttons = fleet.map((ship) => {
    const button = element("button", "", ship.name);
    button.type = "button";
    button.setAttribute("aria-pressed", String(ship.id === selectedFleet));
    button.addEventListener("click", () => { selectedFleet = ship.id; updateFleet(); });
    button.dataset.ship = ship.id;
    return button;
  });
  $("#fleet-selector").replaceChildren(...buttons);
  updateFleet();
}

function updateFleet() {
  const ship = fleet.find((item) => item.id === selectedFleet);
  for (const button of $("#fleet-selector").children) button.setAttribute("aria-pressed", String(button.dataset.ship === ship.id));
  for (const path of document.querySelectorAll("[data-route]")) path.classList.toggle("active", path.dataset.route === ship.id);
  for (const node of document.querySelectorAll("[data-node]")) node.classList.toggle("active", node.dataset.node === ship.id);
  const details = element("dl");
  for (const [label, value] of [["Manifest", "1,000 dormant counterparts"], ["Route", ship.distance]]) {
    const group = element("div");
    group.append(element("dt", "", label), element("dd", "", value));
    details.append(group);
  }
  const panel = $("#fleet-detail");
  panel.replaceChildren(element("span", "tiny-label", `Vessel / ${ship.name}`), element("h3", "", ship.destination), element("p", "", ship.description), details);
  if (spoilers) {
    const note = element("div", "spoiler-note");
    note.append(element("span", "tiny-label", "Last known record · spoilers"), element("p", "", ship.outcome));
    panel.append(note);
  } else {
    panel.append(element("p", "small", "Mission outcomes are hidden. Enable plot spoilers to inspect the last known record."));
  }
}

function setupCharacters() {
  for (const [id, label] of groups) {
    const button = element("button", "", label);
    button.type = "button";
    button.dataset.group = id;
    button.addEventListener("click", () => { characterGroup = id; renderCharacters(); });
    $("#character-filters").append(button);
  }
  $("#character-search").addEventListener("input", renderCharacters);
  renderCharacters();
}

function renderCharacters() {
  if (!spoilers && characterGroup === "next") characterGroup = "all";
  for (const button of $("#character-filters").children) {
    button.setAttribute("aria-pressed", String(button.dataset.group === characterGroup));
    button.disabled = button.dataset.group === "next" && !spoilers;
    button.title = button.disabled ? "Enable plot spoilers to reveal the next generation." : "";
  }
  const query = $("#character-search").value.trim().toLocaleLowerCase();
  const visible = characters.filter((person) =>
    (!person.spoilerOnly || spoilers) &&
    (characterGroup === "all" || person.group === characterGroup) &&
    `${person.name} ${person.role} ${person.purpose} ${spoilers ? person.spoiler : ""}`.toLocaleLowerCase().includes(query));
  $("#character-count").textContent = `${visible.length} ${visible.length === 1 ? "character" : "characters"}${spoilers ? " · plot details revealed" : " · sequel identities hidden"}`;
  if (!visible.some((person) => person.id === selectedCharacter)) selectedCharacter = visible[0]?.id ?? null;
  const buttons = visible.map((person) => {
    const button = element("button", "person-button");
    button.type = "button";
    button.dataset.person = person.id;
    button.setAttribute("aria-pressed", String(person.id === selectedCharacter));
    const initials = element("span", "person-initials", person.initials);
    initials.setAttribute("aria-hidden", "true");
    const label = element("span");
    label.append(element("span", "person-name", person.name), element("span", "person-role", person.role));
    button.append(initials, label);
    button.addEventListener("click", () => {
      selectedCharacter = person.id;
      for (const item of $("#character-list").children) item.setAttribute("aria-pressed", String(item.dataset.person === person.id));
      updateCharacter();
    });
    return button;
  });
  $("#character-list").replaceChildren(...buttons);
  if (!visible.length) $("#character-list").append(element("p", "empty-state", "No matching characters. Try another name or role, or enable plot spoilers to include the next generation."));
  updateCharacter();
}

function updateCharacter() {
  const panel = $("#character-detail");
  const person = characters.find((item) => item.id === selectedCharacter);
  if (!person) {
    panel.replaceChildren(element("span", "tiny-label", "No selection"), element("h3", "", "Every name matters."), element("p", "", "Clear the search or choose another group to return to the cast."));
    return;
  }
  const portrait = element("div", "portrait-mark", person.initials);
  portrait.setAttribute("aria-hidden", "true");
  panel.replaceChildren(portrait, element("span", "tiny-label", person.role), element("h3", "", person.name), element("p", "", person.purpose), element("p", "small", person.note));
  if (spoilers) {
    const note = element("div", "spoiler-note");
    note.append(element("span", "tiny-label", "Full-story record"), element("p", "", person.spoiler));
    panel.append(note);
  }
  if (person.id === "egon") {
    const details = element("details");
    details.append(element("summary", "", "The twelve identities"));
    const list = element("ul", "identity-list");
    identities.forEach((name) => list.append(element("li", "", name)));
    details.append(list, element("p", "small", "One dissociative system, not twelve bodies. DID is not the cause of the story's violence."));
    panel.append(details);
  }
}

function setupTimeline() {
  timeline.forEach((entry) => {
    const button = element("button", "", entry.year);
    button.type = "button";
    button.dataset.year = entry.year;
    button.setAttribute("aria-label", `Explore ${entry.year}`);
    button.addEventListener("click", () => { selectedYear = entry.year; updateTimeline(); });
    $("#timeline-years").append(button);
  });
  updateTimeline();
}

function updateTimeline() {
  const entry = timeline.find((item) => item.year === selectedYear);
  for (const button of $("#timeline-years").children) button.setAttribute("aria-pressed", String(button.dataset.year === entry.year));
  const content = element("div");
  content.append(element("h3", "", entry.title), element("p", "", spoilers ? entry.detail : entry.public));
  if (!spoilers && Number(entry.year) > 2168) content.append(element("span", "locked-label", "Full record hidden · enable plot spoilers to reveal"));
  $("#timeline-detail").replaceChildren(element("span", "timeline-year", entry.year), content);
}

async function getText(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`The server returned HTTP ${response.status} for ${decodeURIComponent(new URL(response.url || url, document.baseURI).pathname)}.`);
  return response.text();
}

function showError(container, message, retry) {
  const panel = element("div", "error-message");
  panel.setAttribute("role", "alert");
  panel.append(element("p", "", message));
  const button = element("button", "retry-button", "Try again");
  button.type = "button";
  button.addEventListener("click", retry);
  panel.append(button);
  container.replaceChildren(panel);
}

async function loadCharts() {
  $("#chart-state").hidden = false;
  $("#chart-state").textContent = "Loading ratings from the story reference…";
  $("#chart-layout").hidden = true;
  $("#source-scores").hidden = true;
  $("#chart-metric").disabled = true;
  try {
    const source = await getText(new URL("./SOT.md", document.baseURI));
    chartData = parseCharts(source);
    $("#chart-state").hidden = true;
    $("#chart-layout").hidden = false;
    $("#source-scores").hidden = false;
    $("#chart-metric").disabled = false;
    updateChartMetrics();
  } catch (error) {
    console.error("Could not load story ratings:", error);
    showError($("#chart-state"), `The charts could not be loaded. ${error.message} Check that SOT.md is deployed alongside this page.`, loadCharts);
  }
}

function updateChartMetrics() {
  if (!chartData) return;
  const data = chartData[chartFamily];
  chartMetric = Math.min(chartMetric, data.metrics.length - 1);
  $("#chart-metric").replaceChildren(...data.metrics.map((name, index) => {
    const option = element("option", "", name);
    option.value = String(index);
    return option;
  }));
  $("#chart-metric").value = String(chartMetric);
  for (const button of document.querySelectorAll("[data-chart-family]")) button.setAttribute("aria-pressed", String(button.dataset.chartFamily === chartFamily));
  renderChart();
}

function renderChart() {
  if (!chartData) return;
  const data = chartData[chartFamily];
  $("#chart-bars").classList.toggle("intensity", chartFamily === "intensity");
  const bars = data.rows.map((row, index) => {
    const score = row.values[chartMetric];
    const button = element("button", "chart-bar");
    button.type = "button";
    button.dataset.index = String(index);
    button.setAttribute("aria-pressed", String(index === chartChapter));
    button.setAttribute("aria-label", `${row.chapter.title}: ${data.metrics[chartMetric]}, ${score} out of 5. Select chapter.`);
    const track = element("span", "bar-track");
    track.setAttribute("aria-hidden", "true");
    const fill = element("span", "bar-fill");
    fill.style.width = `${score * 20}%`;
    track.append(fill);
    button.append(element("span", "bar-title", row.chapter.title), track, element("span", "bar-value", String(score)));
    button.addEventListener("click", () => {
      chartChapter = index;
      for (const item of $("#chart-bars").children) item.setAttribute("aria-pressed", String(Number(item.dataset.index) === index));
      updateSignalDetail();
    });
    return button;
  });
  $("#chart-bars").replaceChildren(...bars);
  updateSignalDetail();
  const table = element("table");
  table.append(element("caption", "", `${data.title} · editorial peak ratings, 0–5 · source: SOT.md`));
  const head = element("thead");
  const header = element("tr");
  ["Chapter", ...data.metrics].forEach((name) => {
    const cell = element("th", "", name);
    cell.scope = "col";
    header.append(cell);
  });
  head.append(header);
  const body = element("tbody");
  data.rows.forEach((row) => {
    const tr = element("tr");
    const title = element("th", "", row.chapter.title);
    title.scope = "row";
    tr.append(title, ...row.values.map((value) => element("td", "", String(value))));
    body.append(tr);
  });
  table.append(head, body);
  $("#chart-table").replaceChildren(table);
}

function updateSignalDetail() {
  if (!chartData) return;
  const data = chartData[chartFamily];
  const row = data.rows[chartChapter];
  const score = element("div", "signal-score", String(row.values[chartMetric]));
  score.append(element("small", "", "/ 5"));
  const description = spoilers ? row.detail : "Chapter-level peak, not an average. The scene explanation is hidden while plot spoilers are off.";
  const read = element("button", "text-link", "Read this chapter ↗");
  read.type = "button";
  read.addEventListener("click", () => openChapter(chartChapter));
  $("#signal-detail").replaceChildren(element("span", "tiny-label", data.metrics[chartMetric]), element("h3", "", row.chapter.title), score, element("p", "", description), read);
}

function saveReaderPosition() {
  if (!readerLoaded || !$("#reader").open) return;
  const scroll = $("#reader-scroll");
  const maximum = scroll.scrollHeight - scroll.clientHeight;
  progress.positions[chapters[readerIndex].id] = maximum > 0 ? Math.min(1, Math.max(0, scroll.scrollTop / maximum)) : 0;
  persistProgress();
}

async function openChapter(index) {
  if (!Number.isInteger(index) || index < 0 || index >= chapters.length) throw new RangeError("Invalid chapter index.");
  saveReaderPosition();
  clearTimeout(progressTimer);
  readerLoaded = false;
  readerRequest?.abort();
  const controller = new AbortController();
  readerRequest = controller;
  readerIndex = index;
  const chapter = chapters[index];
  const dialog = $("#reader");
  const firstOpen = !dialog.open;
  if (firstOpen) {
    returnFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add("reader-open");
    $("#close-reader").focus();
  }
  $("#reader-title").textContent = chapter.title;
  $("#reader-number").textContent = `${chapter.number} / ${chapter.subtitle}`;
  $("#reader-position").textContent = `${index + 1} / ${chapters.length}`;
  $("#reader-chapter").value = String(index);
  $("#reader-meta").textContent = chapter.period;
  $("#chapter-source").href = chapterURL(chapter).href;
  $("#previous-chapter").disabled = index === 0;
  $("#next-chapter").disabled = index === chapters.length - 1;
  $("#mark-read").disabled = true;
  $("#reader-content").replaceChildren();
  $("#reader-state").textContent = "Loading chapter…";
  $("#reader-scroll").scrollTop = 0;
  try {
    let parsed = cache.get(chapter.id);
    if (!parsed) {
      const text = await getText(chapterURL(chapter), controller.signal);
      parsed = parseChapter(text, chapter);
      cache.set(chapter.id, parsed);
    }
    if (controller.signal.aborted || !dialog.open) return;
    const fragment = document.createDocumentFragment();
    parsed.blocks.forEach((block) => {
      if (block.kind === "break") fragment.append(element("hr"));
      else fragment.append(element("p", block.kind === "context" ? "source-context" : "", block.text));
    });
    $("#reader-content").replaceChildren(fragment);
    $("#reader-state").textContent = "";
    $("#reader-meta").textContent = `${chapter.period} · ${parsed.words.toLocaleString()} words · about ${Math.ceil(parsed.words / 220)} min`;
    $("#mark-read").disabled = false;
    progress.last = chapter.id;
    persistProgress();
    renderProgress();
    requestAnimationFrame(() => {
      if (controller.signal.aborted || !dialog.open) return;
      const scroll = $("#reader-scroll");
      scroll.scrollTop = (progress.positions[chapter.id] ?? 0) * Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      readerLoaded = true;
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error(`Could not load ${chapter.title}:`, error);
    showError($("#reader-state"), `This chapter could not be opened. ${error.message} Use “Try again” or the original-text link above.`, () => openChapter(index));
  }
}

function closeReader() {
  saveReaderPosition();
  clearTimeout(progressTimer);
  readerRequest?.abort();
  readerLoaded = false;
  $("#reader").close();
}

$("#close-reader").addEventListener("click", closeReader);
$("#reader").addEventListener("cancel", (event) => { event.preventDefault(); closeReader(); });
$("#reader").addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  closeReader();
});
$("#reader").addEventListener("close", () => {
  document.body.classList.remove("reader-open");
  if (returnFocus instanceof HTMLElement && returnFocus.isConnected && !returnFocus.hasAttribute("disabled")) returnFocus.focus();
});
$("#reader-chapter").addEventListener("change", (event) => openChapter(Number(event.target.value)));
$("#previous-chapter").addEventListener("click", () => openChapter(readerIndex - 1));
$("#next-chapter").addEventListener("click", () => openChapter(readerIndex + 1));
$("#reader-scroll").addEventListener("scroll", () => {
  if (!readerLoaded) return;
  clearTimeout(progressTimer);
  progressTimer = setTimeout(saveReaderPosition, 200);
}, { passive: true });
window.addEventListener("pagehide", saveReaderPosition);
$("#mark-read").addEventListener("click", () => {
  if (!readerLoaded) return;
  const id = chapters[readerIndex].id;
  if (!progress.read.includes(id)) progress.read.push(id);
  persistProgress();
  renderProgress();
});

function setReadingSize(size) {
  readingSize = Math.min(27, Math.max(16, size));
  $("#reader-content").style.setProperty("--reading-size", `${readingSize}px`);
  $("#smaller-text").disabled = readingSize === 16;
  $("#larger-text").disabled = readingSize === 27;
}
$("#smaller-text").addEventListener("click", () => setReadingSize(readingSize - 1));
$("#larger-text").addEventListener("click", () => setReadingSize(readingSize + 1));

function closeMenu() {
  $("#site-header").classList.remove("menu-open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
}
$("#menu-toggle").addEventListener("click", () => {
  const open = $("#site-header").classList.toggle("menu-open");
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
});
$("#primary-nav").addEventListener("click", (event) => { if (event.target.closest("a")) closeMenu(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
window.matchMedia("(min-width: 901px)").addEventListener("change", closeMenu);

$("#spoiler-toggle").addEventListener("change", (event) => {
  spoilers = event.target.checked;
  $("#spoiler-label").textContent = spoilers ? "on" : "off";
  updateFleet();
  renderCharacters();
  updateTimeline();
  updateSignalDetail();
});
for (const button of document.querySelectorAll("[data-chart-family]")) {
  button.addEventListener("click", () => { chartFamily = button.dataset.chartFamily; chartMetric = 0; updateChartMetrics(); });
}
$("#chart-metric").addEventListener("change", (event) => { chartMetric = Number(event.target.value); renderChart(); });
$("#begin-reading").addEventListener("click", () => {
  const index = chapters.findIndex((chapter) => chapter.id === progress.last);
  openChapter(index < 0 ? 0 : index);
});
$("#closing-read").addEventListener("click", () => openChapter(0));
$("#reset-progress").addEventListener("click", () => {
  progress = initialProgress();
  persistProgress();
  renderProgress();
});

renderChapters();
renderFleet();
setupCharacters();
setupTimeline();
loadCharts();
