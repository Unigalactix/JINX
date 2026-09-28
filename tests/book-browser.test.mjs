import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createPreviewServer } from "../tools/serve.mjs";
import { chapters, parseChapter } from "../assets/content.js";

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

async function openBook(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], "No uncaught browser errors"));
  await page.goto(origin);
  await page.locator("#begin-reading").click();
  await ready(page);
  return page;
}

async function ready(page) {
  await page.waitForFunction(() =>
    document.querySelector("#reader").open &&
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

async function turn(page, direction = "next") {
  await page.locator(`#${direction}-page`).evaluate((button) => button.click());
  await finishTurn(page);
}

test("hero opens the cover; opening, next and previous use real 3D page turns", async (t) => {
  const page = await openBook(t);
  assert.equal(await page.locator("#book-page img").getAttribute("src"), `${origin}assets/jinx-book-cover.png`);
  await page.locator("#book-page .book-cover-open").click();
  const motion = await page.locator(".book-leaf").evaluate((leaf) => ({
    duration: leaf.getAnimations()[0].effect.getTiming().duration,
    transforms: leaf.getAnimations()[0].effect.getKeyframes().map((frame) => frame.transform),
    origin: getComputedStyle(leaf).transformOrigin,
  }));
  assert.equal(motion.duration, 720);
  assert.deepEqual(motion.transforms, ["rotateY(0deg)", "rotateY(-95deg)", "rotateY(-175deg)"]);
  assert.match(motion.origin, /^0px /);
  await finishTurn(page);
  const first = await page.locator("#book-page").textContent();
  assert.match(first, /By noon, the prisoners/);
  await turn(page);
  assert.notEqual(await page.locator("#book-page").textContent(), first);
  await page.locator("#previous-page").click();
  assert.equal(await page.locator("#book").getAttribute("data-turning"), "backward");
  await finishTurn(page);
  assert.equal(await page.locator("#book-page").textContent(), first);
  await page.locator("#book").press("ArrowRight");
  await finishTurn(page);
  await page.locator("#mark-read").click();
  await page.locator("#close-reader").click();
  assert.equal(await page.locator("#reader").evaluate((dialog) => dialog.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), "begin-reading");
  assert.match(await page.locator("#reading-progress").textContent(), /^1 \/ 8/);
  await page.locator("#begin-reading").click();
  await ready(page);
  assert.equal(await page.locator("#book-page img").count(), 1);
  await turn(page);
  assert.match(await page.locator("#reader-position").textContent(), /Page 2 /);
});

for (const language of ["en", "te", "hi", "es"]) {
  test(`every rendered page preserves every ${language} story block and downloads work`, { timeout: 120000 }, async (t) => {
    const page = await openBook(t);
    const root = new URL("../", import.meta.url);
    if (language !== "en") {
      await page.locator("#book-language").selectOption(language);
      await ready(page);
    }
    const edition = language === "en" ? {
      chapters: await Promise.all(chapters.map(async (chapter) => ({
        ...chapter, blocks: parseChapter(await readFile(new URL(chapter.path, root), "utf8"), chapter).blocks,
      }))),
    } : JSON.parse(await readFile(new URL(`assets/books/${language}.json`, root), "utf8"));
    assert.equal(await page.locator("#book").getAttribute("lang"), language);
    for (const [chapterIndex, chapter] of edition.chapters.entries()) {
      await page.locator("#reader-chapter").selectOption(String(chapterIndex));
      await finishTurn(page);
      const actual = chapter.blocks.map(() => "");
      const count = Number((await page.locator("#book-page .book-folio").textContent()).split("/").at(-1));
      assert.ok(count > 1);
      for (let pageIndex = 0; pageIndex < count; pageIndex++) {
        const result = await page.locator("#book-page .book-page-text").evaluate((content) => ({
          clipped: content.scrollHeight > content.clientHeight + 1,
          parts: [...content.querySelectorAll("[data-block]")].map((part) => ({
            block: Number(part.dataset.block), text: part.tagName === "HR" ? "***" : part.textContent,
          })),
        }));
        assert.equal(result.clipped, false, `${language}/${chapter.id}/${pageIndex} must not clip text`);
        for (const part of result.parts) actual[part.block] += part.text;
        if (pageIndex < count - 1) await turn(page);
      }
      assert.deepEqual(actual, chapter.blocks.map((block) => block.text), `${language}/${chapter.id}: no missing or duplicated text`);
    }
    assert.equal(await page.locator("#next-page").isDisabled(), true, "Final page is bounded");
    for (const format of ["pdf", "epub"]) {
      const downloadPromise = page.waitForEvent("download");
      await page.locator(`#download-${format}`).click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), `JINX-${language}.${format}`);
      assert.equal(await download.failure(), null);
      await download.delete();
    }
  });
}

test("mobile reflow, font sizing, swipes, reduced motion and cover resume stay usable", async (t) => {
  const page = await openBook(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await page.locator("#next-page").click();
  const animation = await page.locator(".book-leaf").evaluate((leaf) => ({
    duration: leaf.getAnimations()[0].effect.getTiming().duration,
    transforms: leaf.getAnimations()[0].effect.getKeyframes().map((frame) => frame.transform),
  }));
  assert.equal(animation.duration, 120);
  assert.ok(animation.transforms.every((transform) => transform === undefined));
  await finishTurn(page);
  await page.locator("#book").evaluate((book) => {
    book.dispatchEvent(new TouchEvent("touchstart", { touches: [new Touch({ identifier: 1, target: book, clientX: 270, clientY: 300 })] }));
    book.dispatchEvent(new TouchEvent("touchend", { changedTouches: [new Touch({ identifier: 1, target: book, clientX: 80, clientY: 302 })] }));
  });
  await finishTurn(page);
  assert.match(await page.locator("#reader-position").textContent(), /Page 2 /);
  const anchor = Number(await page.locator("#book-page [data-block]").first().getAttribute("data-block"));
  await page.locator("#larger-text").click();
  const resizedAnchor = Number(await page.locator("#book-page [data-block]").first().getAttribute("data-block"));
  assert.ok(resizedAnchor <= anchor);
  await page.locator("#book-cover").click();
  await finishTurn(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await ready(page);
  await turn(page);
  const layout = await page.evaluate(() => {
    const dialog = document.querySelector("#reader");
    const content = document.querySelector("#book-page .book-page-text");
    return { width: dialog.getBoundingClientRect().width, viewport: innerWidth, clipped: content.scrollHeight > content.clientHeight + 1 };
  });
  assert.ok(layout.width <= layout.viewport);
  assert.equal(layout.clipped, false);
  await page.setViewportSize({ width: 844, height: 390 });
  await ready(page);
  await turn(page);
  assert.equal(await page.locator("#book-page .book-page-text").evaluate((content) => content.scrollHeight > content.clientHeight + 1), false);
  await page.locator("#book").press("Escape");
  assert.equal(await page.locator("#reader").evaluate((dialog) => dialog.open), false);
});

test("missing translations show an explicit retry error rather than English fallback", async (t) => {
  const page = await openBook(t);
  await page.route("**/assets/books/te.json", (route) => route.fulfill({ status: 404, body: "Not found" }));
  await page.locator("#book-language").selectOption("te");
  await page.locator("#reader-state .retry-button").waitFor();
  assert.match(await page.locator("#reader-state").textContent(), /HTTP 404/);
  assert.equal(await page.locator("#next-page").isDisabled(), true);
  await page.unroute("**/assets/books/te.json");
  await page.locator("#reader-state .retry-button").click();
  await ready(page);
  await turn(page);
  assert.match(await page.locator("#book-page .book-page-text").textContent(), /\p{Script=Telugu}/u);
});

test("language changes preserve the chapter and nearby paragraph, including from the cover", async (t) => {
  const page = await openBook(t);
  await page.locator("#reader-chapter").selectOption("2");
  await finishTurn(page);
  await turn(page);
  const anchor = Number(await page.locator("#book-page [data-block]").first().getAttribute("data-block"));
  await page.locator("#book-language").selectOption("es");
  await finishTurn(page);
  assert.equal(await page.locator("#reader-chapter").inputValue(), "2");
  const first = Number(await page.locator("#book-page [data-block]").first().getAttribute("data-block"));
  const last = Number(await page.locator("#book-page [data-block]").last().getAttribute("data-block"));
  assert.ok(first <= anchor && last >= anchor);
  await page.locator("#book-cover").click();
  await finishTurn(page);
  await page.locator("#book-language").selectOption("en");
  await ready(page);
  assert.equal(await page.locator("#book-page img").count(), 1);
  await turn(page);
  assert.equal(await page.locator("#reader-chapter").inputValue(), "2");
  assert.ok(Number(await page.locator("#book-page [data-block]").first().getAttribute("data-block")) <= first);
  await page.locator("#close-reader").click();
  await page.reload();
  await page.locator("#begin-reading").click();
  await ready(page);
  assert.equal(await page.locator("#book-language").inputValue(), "en");
});

test("closing during a page turn cancels cleanly and chapter boundaries turn both directions", async (t) => {
  const page = await openBook(t);
  await page.locator("#next-page").click();
  await page.locator("#close-reader").click();
  await page.locator("#begin-reading").click();
  await ready(page);
  await page.locator("#reader-chapter").selectOption("1");
  await finishTurn(page);
  await turn(page, "previous");
  assert.equal(await page.locator("#reader-chapter").inputValue(), "0");
  const numbers = (await page.locator("#book-page .book-folio span").last().textContent()).match(/(\d+) \/ (\d+)$/);
  assert.equal(numbers[1], numbers[2]);
  await turn(page);
  assert.equal(await page.locator("#reader-chapter").inputValue(), "1");
  assert.match(await page.locator("#reader-position").textContent(), /^Page 1 /);
});
