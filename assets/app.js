import { chapters, characters, groups, identities, fleet, timeline, parseCharts, initialProgress, validProgress } from "./content.js";
import { createBookReader } from "./book-reader.js";
import { setupMoments } from "./moments.js";

const $ = (selector) => document.querySelector(selector);
const storageKey = "jinx-reading-v1";
let spoilers = false;
let selectedCharacter = "egon";
let characterGroup = "all";
let selectedFleet = "mercy";
let selectedYear = "2165";
let chartFamily = "emotions";
let chartMetric = 0;
let chartChapter = 0;
let chartData = null;
let storageAvailable = true;

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
  bookReader.refreshProgress();
}

function renderChapters() {
  const fragment = document.createDocumentFragment();
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
  });
  $("#chapter-grid").replaceChildren(fragment);
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

const bookReader = createBookReader({
  getProgress: () => progress,
  onError: notice,
  onPosition(index, ratio) {
    const id = chapters[index].id;
    progress.last = id;
    progress.positions[id] = ratio;
    persistProgress();
    renderProgress();
  },
  onMarkRead(index) {
    const id = chapters[index].id;
    if (!progress.read.includes(id)) progress.read.push(id);
    persistProgress();
    renderProgress();
  },
});

function openChapter(index) {
  bookReader.open({ chapterIndex: index, cover: false });
}

const momentsExperience = setupMoments({
  openChapter,
  revealSpoilers: () => setSpoilers(true),
});

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

function setSpoilers(value) {
  spoilers = value;
  $("#spoiler-toggle").checked = value;
  $("#spoiler-label").textContent = spoilers ? "on" : "off";
  updateFleet();
  renderCharacters();
  updateTimeline();
  updateSignalDetail();
  momentsExperience.setSpoilers(spoilers);
  $("#redo-volume-details").hidden = !spoilers;
  $("#redo-volume-teaser").hidden = spoilers;
}
$("#spoiler-toggle").addEventListener("change", (event) => setSpoilers(event.target.checked));
$("#redo-reveal").addEventListener("click", () => {
  setSpoilers(true);
  $("#redo-discovery-title").focus({ preventScroll: true });
});
for (const button of document.querySelectorAll("[data-chart-family]")) {
  button.addEventListener("click", () => { chartFamily = button.dataset.chartFamily; chartMetric = 0; updateChartMetrics(); });
}
$("#chart-metric").addEventListener("change", (event) => { chartMetric = Number(event.target.value); renderChart(); });
$("#begin-reading").addEventListener("click", () => {
  const index = chapters.findIndex((chapter) => chapter.id === progress.last);
  bookReader.open({ chapterIndex: index < 0 ? 0 : index, cover: true });
});
$("#closing-read").addEventListener("click", () => bookReader.open({ cover: true }));
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
