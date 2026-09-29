import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createPreviewServer } from "../tools/serve.mjs";
import { chapters } from "../assets/jinxed-content.js";
import { validateEdition } from "../assets/book-reader.js";

const root = new URL("../", import.meta.url);
const english = {
  language: "en", title: "JINXED", subtitle: "The ring remains",
  chapters: chapters.map((chapter) => ({
    id: chapter.id, title: chapter.title, subtitle: "",
    blocks: [{ kind: "context", text: chapter.period }, ...chapter.paragraphs.map((text) => ({ kind: text === "***" ? "break" : "paragraph", text }))],
  })),
};
let browser;
let server;
let origin;
before(async () => {
  browser = await chromium.launch({ headless: true });
  server = createPreviewServer("/JINX/");
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}/JINX/`;
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
});

async function openArchive(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  await page.goto(origin + "jinxed.html");
  await page.locator("#unlock-archive").click();
  await page.locator("#archive-code").fill("JINXED");
  await page.locator(".archive-code-dialog button[type=submit]").click();
  await page.locator("#jinxed-title").waitFor();
  return page;
}

async function ready(page) {
  await page.waitForFunction(() => document.querySelector("#reader").open &&
    document.querySelector("#book").getAttribute("aria-busy") === "false" &&
    !document.querySelector("#book").dataset.turning &&
    !document.querySelector("#reader-state").textContent);
}
async function finishTurn(page) {
  await page.evaluate(() => {
    for (const animation of document.querySelector(".book-leaf")?.getAnimations() ?? []) animation.finish();
  });
  await ready(page);
}
async function turn(page) {
  await page.locator("#next-page").evaluate((button) => button.click());
  await finishTurn(page);
}

test("JINXED has its own cover and real 3D cover/page turns, fullscreen, and isolated progress", async (t) => {
  const page = await openArchive(t);
  await page.evaluate(() => localStorage.setItem("jinx-reading-v1", "original-record"));
  await page.locator("#begin-jinxed").click();
  await ready(page);
  assert.ok((await page.locator("#book-page img").getAttribute("src")).endsWith("jinxed-book-cover.svg"));
  await page.locator(".book-cover-open").click();
  const motion = await page.locator(".book-leaf").evaluate((leaf) => ({
    duration: leaf.getAnimations()[0].effect.getTiming().duration,
    transforms: leaf.getAnimations()[0].effect.getKeyframes().map(({ transform }) => transform),
  }));
  assert.equal(motion.duration, 720);
  assert.deepEqual(motion.transforms, ["rotateY(0deg)", "rotateY(-95deg)", "rotateY(-175deg)"]);
  await finishTurn(page);
  await turn(page);
  assert.match(await page.locator("#reader-position").textContent(), /Page 2/);
  await page.locator("#mark-read").click();
  await page.locator("#book-fullscreen").click();
  await page.waitForFunction(() => document.querySelector("#reader").classList.contains("reader-full-page"));
  await page.locator("#book-fullscreen").click();
  await ready(page);
  await page.locator("#close-reader").click();
  assert.equal(await page.evaluate(() => document.activeElement.id), "begin-jinxed");
  assert.equal(await page.evaluate(() => localStorage.getItem("jinx-reading-v1")), "original-record");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("jinxed-reading-v1")));
  assert.deepEqual(saved.read, ["chapter-1"]);
  assert.ok(saved.positions["chapter-1"] > 0);
  await page.reload();
  await page.locator("#begin-jinxed").click();
  await ready(page);
  await turn(page);
  assert.match(await page.locator("#reader-position").textContent(), /Page 2/);
});

for (const language of ["en", "te", "hi", "es"]) {
  test(`all JINXED ${language} pages preserve every paragraph without clipping`, { timeout: 120000 }, async (t) => {
    const edition = language === "en" ? english : JSON.parse(await readFile(new URL(`assets/books/jinxed-${language}.json`, root), "utf8"));
    validateEdition(edition, language, language === "en" ? undefined : english, { chapterMetadata: chapters, title: "JINXED" });
    if (language !== "en") {
      edition.chapters.forEach((chapter, chapterIndex) => {
        chapter.blocks.forEach((block, index) => {
          if (block.kind === "paragraph") assert.notEqual(block.text, english.chapters[chapterIndex].blocks[index].text, "No untranslated paragraph");
        });
      });
    }
    const page = await openArchive(t, { reducedMotion: "reduce" });
    await page.locator("#begin-jinxed").click();
    await ready(page);
    await page.locator("#book-language").selectOption(language);
    await ready(page);
    assert.equal(await page.locator("#book").getAttribute("lang"), language);
    for (const [index, chapter] of edition.chapters.entries()) {
      await page.locator("#reader-chapter").selectOption(String(index));
      await finishTurn(page);
      const actual = chapter.blocks.map(() => "");
      const count = Number((await page.locator("#book-page .book-folio").textContent()).split("/").at(-1));
      assert.ok(count > 1);
      for (let pageIndex = 0; pageIndex < count; pageIndex++) {
        const result = await page.locator("#book-page .book-page-text").evaluate((text) => ({
          clipped: text.scrollHeight > text.clientHeight + 1,
          parts: [...text.querySelectorAll("[data-block]")].map((part) => ({
            block: Number(part.dataset.block), text: part.tagName === "HR" ? "***" : part.textContent,
          })),
        }));
        assert.equal(result.clipped, false, `${language}/${chapter.id}/${pageIndex}`);
        for (const part of result.parts) actual[part.block] += part.text;
        if (pageIndex < count - 1) await turn(page);
      }
      assert.deepEqual(actual, chapter.blocks.map(({ text }) => text));
    }
    assert.equal(await page.locator("#next-page").isDisabled(), true);
    await page.locator("#close-reader").click();
    await page.reload();
    await page.locator("#begin-jinxed").click();
    await ready(page);
    assert.equal(await page.locator("#book-language").inputValue(), language);
  });
}

test("JINXED translations fail visibly and retry without silently showing English", async (t) => {
  const page = await openArchive(t);
  await page.locator("#begin-jinxed").click();
  await ready(page);
  await page.route("**/jinxed-hi.json", (route) => route.fulfill({ status: 404, body: "Missing" }));
  await page.locator("#book-language").selectOption("hi");
  await page.locator("#reader-state .retry-button").waitFor();
  assert.match(await page.locator("#reader-state").textContent(), /HTTP 404/);
  assert.equal(await page.locator("#next-page").isDisabled(), true);
  await page.unroute("**/jinxed-hi.json");
  await page.locator("#reader-state .retry-button").click();
  await ready(page);
  assert.equal(await page.locator("#book").getAttribute("lang"), "hi");
});

test("Earth texture and both ring layers rotate, pause, and respect reduced motion", async (t) => {
  const page = await openArchive(t);
  const motions = await page.locator("#rotating-earth").evaluate((world) => world.getAnimations({ subtree: true }).map((animation) => ({
    name: animation.animationName, state: animation.playState, time: animation.currentTime,
  })));
  assert.equal(motions.filter(({ name }) => name === "jinxed-earth-spin").length, 2);
  assert.equal(motions.filter(({ name }) => name === "jinxed-ring-spin").length, 2);
  assert.ok(motions.every(({ state }) => state === "running"));
  assert.match(await page.locator(".earth-surface").evaluate((el) => getComputedStyle(el).backgroundImage), /earth-map.svg/);
  await page.locator("#hero-motion").click();
  assert.equal(await page.locator("#hero-motion").textContent(), "Play rotation");
  assert.ok(await page.locator("#rotating-earth").evaluate((world) => world.getAnimations({ subtree: true }).every((animation) => animation.playState === "paused")));
  await page.locator("#hero-motion").click();
  assert.ok(await page.locator("#rotating-earth").evaluate((world) => world.getAnimations({ subtree: true }).every((animation) => animation.playState === "running")));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector("#hero-motion").getAttribute("aria-pressed") === "true");
  assert.ok(await page.locator("#rotating-earth").evaluate((world) => world.getAnimations({ subtree: true }).every((animation) => animation.playState === "paused")));
  await page.locator("#hero-motion").click();
  assert.ok(await page.locator("#rotating-earth").evaluate((world) => world.getAnimations({ subtree: true }).every((animation) => animation.playState === "running")));
});

test("mobile translated book supports reduced-motion turns and larger text", async (t) => {
  const page = await openArchive(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await page.locator("#begin-jinxed").click();
  await ready(page);
  await page.locator("#book-language").selectOption("te");
  await ready(page);
  await page.locator("#next-page").click();
  assert.equal(await page.locator(".book-leaf").evaluate((leaf) => leaf.getAnimations()[0].effect.getTiming().duration), 120);
  await finishTurn(page);
  await page.locator("#larger-text").click();
  await page.locator("#book").press("ArrowRight");
  await finishTurn(page);
  assert.equal(await page.locator("#book-page .book-page-text").evaluate((text) => text.scrollHeight > text.clientHeight + 1), false);
  assert.ok(await page.locator("#reader").evaluate((dialog) => dialog.getBoundingClientRect().width <= innerWidth));
});
