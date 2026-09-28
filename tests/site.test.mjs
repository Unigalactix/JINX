import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chapters, characters, fleet, identities, timeline, parseCharts, parseChapter, initialProgress, validProgress } from "../assets/content.js";
import { createPreviewServer } from "../tools/serve.mjs";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("SOT.md", root), "utf8");

test("eight chapters, twelve identities, five ships, and distinct sequel families", () => {
  assert.equal(chapters.length, 8);
  assert.equal(new Set(chapters.map(({ id }) => id)).size, 8);
  assert.equal(identities.length, 12);
  assert.equal(new Set(identities).size, 12);
  assert.equal(fleet.length, 5);
  assert.equal(fleet[0].distance, "35 light-years");
  assert.match(characters.find(({ id }) => id === "rak").purpose, /Mateo and Leena/);
  assert.match(characters.find(({ id }) => id === "theo").purpose, /Helen and David/);
  assert.equal(timeline[0].year, "2165");
  assert.equal(timeline.at(-1).year, "2180");
});

test("charts consume the actual SOT tables with all editorial scores", () => {
  const charts = parseCharts(source);
  assert.equal(charts.emotions.metrics.length, 8);
  assert.equal(charts.intensity.metrics.length, 3);
  assert.equal(charts.emotions.rows.length, 8);
  assert.equal(charts.intensity.rows.length, 8);
  assert.deepEqual(charts.emotions.rows[0].values, [5, 4, 4, 4, 3, 1, 2, 0]);
  assert.deepEqual(charts.intensity.rows[0].values, [5, 5, 5]);
  assert.deepEqual(charts.intensity.rows[6].values, [0, 0, 5]);
  assert.deepEqual(charts.intensity.rows[7].values, [0, 0, 2]);
  assert.match(charts.emotions.rows[6].detail, /grief/i);
  assert.match(charts.intensity.rows[4].detail, /blood rain/i);
});

test("malformed, missing, reordered, or out-of-range chart data fails explicitly", () => {
  assert.throws(() => parseCharts(source.replace("### Whole-story emotion matrix", "### Missing matrix")), /missing/);
  assert.throws(() => parseCharts(source.replace("| Prologue | 5 | 4 | 4", "| Prologue | 9 | 4 | 4")), /0–5/);
  assert.throws(() => parseCharts(source.replace("| Prologue | 5 | 4 | 4", "| Changed | 5 | 4 | 4")), /order/);
  assert.throws(() => parseCharts(source.replace("| Fear/horror |", "| Different score |")), /columns/);
  assert.throws(() => parseCharts("<html>Not a story reference</html>"), /missing/);
});

test("every original chapter loads, remains substantial, and preserves its paragraph text", async () => {
  for (const chapter of chapters) {
    const text = await readFile(new URL(chapter.path, root), "utf8");
    const parsed = parseChapter(text, chapter);
    assert.ok(parsed.words > 800, `${chapter.title} should be a full story chapter`);
    assert.equal(parsed.blocks[0].kind, "context");
    for (const block of parsed.blocks) assert.ok(text.replace(/\r\n?/g, "\n").includes(block.text));
    assert.ok(parsed.blocks.some(({ kind }) => kind === "break"));
  }
});

test("chapter parser rejects a wrong document or incomplete response", () => {
  assert.throws(() => parseChapter("<html>404</html>", chapters[0]), /expected chapter/);
  assert.throws(() => parseChapter("JINX\n\nPROLOGUE", chapters[0]), /incomplete/);
  assert.throws(() => parseChapter("CHAPTER ONE\nHALLELUJAH", chapters[4]), /expected chapter/);
});

test("reading records validate chapter IDs, versions, unique read flags, and bounded positions", () => {
  assert.ok(validProgress(initialProgress()));
  assert.ok(validProgress({ version: 1, last: "666", read: ["prologue"], positions: { prologue: 0.5, "666": 1 } }));
  for (const record of [
    null, [], {}, { ...initialProgress(), version: 2 }, { ...initialProgress(), last: "missing" },
    { ...initialProgress(), read: ["prologue", "prologue"] }, { ...initialProgress(), positions: [] },
    { ...initialProgress(), positions: { prologue: -0.1 } }, { ...initialProgress(), positions: { prologue: 1.1 } },
    { ...initialProgress(), positions: { prologue: Infinity } }, { ...initialProgress(), positions: { missing: 0.5 } },
  ]) assert.equal(validProgress(record), false);
});

test("static entrypoint uses relative assets and provides a no-JavaScript reading path", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /<noscript>/);
  assert.match(html, /src="\.\/assets\/app\.js"/);
  assert.match(html, /href="\.\/assets\/site\.css"/);
  assert.doesNotMatch(html, /(?:src|href)="\/(?:assets|Story)/);
  assert.match(html, /<dialog[^>]+aria-labelledby="reader-title"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  await readFile(new URL(".nojekyll", root));
});

test("preview serves the site under a GitHub Pages-style project path", async (t) => {
  const server = createPreviewServer("/JINX/");
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const path of ["", "assets/app.js", "assets/content.js", "assets/site.css", "assets/favicon.svg", "SOT.md", ...chapters.map(({ path }) => path)]) {
    const response = await fetch(`${origin}/JINX/${encodeURI(path)}`);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 0, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
  const module = await fetch(`${origin}/JINX/assets/app.js`);
  assert.match(module.headers.get("content-type"), /javascript/);
  await module.text();
  for (const path of ["/assets/app.js", "/JINX/missing.txt", "/JINX/.git/config", "/JINX/package.json"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
    await response.text();
  }
  const malformed = await fetch(`${origin}/JINX/%ZZ`);
  assert.equal(malformed.status, 400);
  await malformed.text();
  const post = await fetch(`${origin}/JINX/`, { method: "POST" });
  assert.equal(post.status, 405);
  await post.text();
  const redirect = await fetch(origin, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/JINX/");
  await redirect.text();
  const head = await fetch(`${origin}/JINX/`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("preview rejects ambiguous base paths", () => {
  for (const base of ["JINX", "/JINX", "/../", "//", "/a b/"]) assert.throws(() => createPreviewServer(base), /base path/);
});
