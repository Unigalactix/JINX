import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { chromium } from "playwright";
import { createPreviewServer } from "../tools/serve.mjs";
import { chapters, moments, references } from "../assets/jinxed-content.js";

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

async function openPage(t, options = {}, path = "") {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], "No uncaught browser errors"));
  await page.goto(origin + path);
  return page;
}

async function enterCode(page, code = "JINXED") {
  await page.locator("#archive-code").fill(code);
  await page.locator(".archive-code-dialog button[type=submit]").click();
}

async function unlock(page) {
  await page.locator(".site-header .wordmark").dblclick();
  await enterCode(page);
  await page.waitForURL("**/jinxed.html");
  await page.locator("#jinxed-title").waitFor();
}

test("two full chapters and only their own moments and references", () => {
  assert.deepEqual(chapters.map(({ title }) => title), ["Chapter 1", "Chapter 2"]);
  for (const chapter of chapters) {
    assert.ok(chapter.paragraphs.join(" ").split(/\s+/).length > 800, `${chapter.title} is full prose, not a synopsis`);
    assert.doesNotMatch(chapter.paragraphs.join(" "), /\bREDO\b|\bZan\b|\bJINX\b/i);
  }
  assert.equal(moments.length, 3);
  assert.match(chapters[0].paragraphs.join(" "), /inward motion slowed/);
  assert.match(chapters[1].paragraphs.join(" "), /ring around the planet/);
  for (const record of [...moments, ...references]) {
    assert.ok(chapters[record.chapter]);
    assert.doesNotMatch(JSON.stringify(record), /\bREDO\b|\bJINX\b/i);
  }
});

test("direct URLs and wrong codes do not expose or request story content", async (t) => {
  const page = await openPage(t, {}, "jinxed.html#chapters");
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.reload();
  assert.equal(await page.locator("#jinxed-content").isVisible(), false);
  assert.equal(await page.locator("#jinxed-content").textContent(), "");
  await page.locator("#unlock-archive").click();
  await enterCode(page, "jinxed");
  assert.equal(await page.locator("#archive-code-error").textContent(), "Incorrect code. Try again.");
  assert.equal(await page.locator("#archive-code").getAttribute("aria-invalid"), "true");
  assert.equal(await page.locator("#jinxed-content").textContent(), "");
  assert.equal(requests.some((url) => url.endsWith("/jinxed-content.js")), false);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".archive-code-dialog").evaluate((dialog) => dialog.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), "unlock-archive");
});

test("navbar single click remains home, double click prompts, cancel restores focus, and code unlocks", async (t) => {
  const page = await openPage(t);
  const logo = page.locator(".site-header .wordmark");
  await logo.click();
  assert.ok(page.url().endsWith("#home"));
  assert.equal(await page.locator(".archive-code-dialog").evaluate((dialog) => dialog.open), false);
  await logo.dblclick();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await logo.evaluate((node) => node === document.activeElement), true);
  await unlock(page);
  assert.equal(await page.title(), "JINXED - The ring remains");
  assert.equal(await page.locator(".jinxed-chapters button").count(), 2);
  assert.doesNotMatch(await page.locator("body").innerText(), /\bREDO\b|\bJINX\b|\bZan\b/);
  assert.equal(await page.locator("#sealed-archive").isVisible(), false);
  await page.reload();
  await page.locator("#jinxed-title").waitFor();
  await page.locator("#lock-archive").click();
  await page.waitForURL("**/index.html");
  await page.goBack();
  await page.locator("#sealed-archive").waitFor();
  assert.equal(await page.locator("#jinxed-content").textContent(), "");
  await page.goto(origin + "jinxed.html");
  assert.equal(await page.locator("#jinxed-content").textContent(), "");
});

test("chapter and reference entry points open only the JINXED book", async (t) => {
  const page = await openPage(t, { reducedMotion: "reduce" });
  await unlock(page);
  async function checkChapter(index) {
    await page.waitForFunction(() => document.querySelector("#book").getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#reader-chapter").inputValue(), String(index));
    assert.equal(await page.locator("#book-page h3").textContent(), chapters[index].title);
    assert.match(await page.locator(".book-running-title").textContent(), /^JINXED/);
    await page.locator("#close-reader").click();
  }
  for (let index = 0; index < chapters.length; index++) {
    await page.locator(".jinxed-chapters button").nth(index).click();
    await checkChapter(index);
  }
  for (let index = 0; index < references.length; index++) {
    await page.locator(".jinxed-reference button").nth(index).click();
    await checkChapter(references[index].chapter);
  }
  assert.equal(await page.locator("#reader-chapter option").count(), 3, "Only cover and the two sequel chapters");
  assert.equal(await page.locator("#download-pdf").count(), 0, "Never links to original downloads");
});

test("keyboard and mobile touch unlock work without overflow", async (t) => {
  const page = await openPage(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const logo = page.locator(".site-header .wordmark");
  await logo.focus();
  await logo.press("Shift+Enter");
  assert.equal(await page.locator("#archive-code").evaluate((input) => input === document.activeElement), true);
  await page.keyboard.press("Escape");
  await logo.tap();
  await logo.tap();
  await enterCode(page);
  await page.locator("#jinxed-title").waitFor();
  await page.locator(".jinxed-chapters button").last().click();
  await page.locator("#book-page h3").waitFor();
  assert.equal(await page.locator("#book-page h3").textContent(), "Chapter 2");
  await page.locator("#close-reader").click();
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(width.scroll <= width.viewport, `${width.scroll} must fit ${width.viewport}`);
  assert.equal(await page.locator("#jinxed-nav").isVisible(), true);
});

test("unavailable session storage produces a visible error without navigation", async (t) => {
  const page = await openPage(t);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  });
  await page.locator(".site-header .wordmark").dblclick();
  await enterCode(page);
  assert.match(await page.locator("#archive-code-error").textContent(), /Allow session storage/);
  assert.equal(await page.locator(".archive-code-dialog").evaluate((dialog) => dialog.open), true);
  assert.ok(!page.url().includes("jinxed.html"));
});

test("failed story load reports an error and offers a working retry", async (t) => {
  const page = await openPage(t, {}, "jinxed.html");
  await page.route("**/jinxed-content.js", (route) => route.abort());
  await page.locator("#unlock-archive").click();
  await enterCode(page);
  await page.locator("#retry-archive").waitFor();
  assert.match(await page.locator("#archive-status").textContent(), /could not be loaded/);
  assert.equal(await page.locator("#jinxed-content").isVisible(), false);
  await page.unroute("**/jinxed-content.js");
  await page.locator("#retry-archive").click();
  await page.locator("#jinxed-title").waitFor();
  assert.equal(await page.locator("#archive-status").isVisible(), false);
});

test("preview serves seekable video ranges without exposing arbitrary files", async () => {
  const url = origin + "assets/jinxed-videos/approach.webm";
  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-type"), "video/webm");
  assert.equal(head.headers.get("accept-ranges"), "bytes");
  const size = Number(head.headers.get("content-length"));
  assert.ok(size > 1000);
  for (const [range, start, end] of [["bytes=0-99", 0, 99], ["bytes=-50", size - 50, size - 1], [`bytes=${size - 20}-`, size - 20, size - 1]]) {
    const response = await fetch(url, { headers: { Range: range } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), `bytes ${start}-${end}/${size}`);
    assert.equal((await response.arrayBuffer()).byteLength, end - start + 1);
  }
  for (const range of ["bytes=-0", "bytes=-", "bytes=100-20", `bytes=${size}-`, "bytes=0-10,20-30"]) {
    const response = await fetch(url, { headers: { Range: range } });
    assert.equal(response.status, 416);
    await response.text();
  }
  const disallowed = await fetch(origin + "assets/jinxed-videos/private.webm");
  assert.equal(disallowed.status, 404);
  await disallowed.text();
});
