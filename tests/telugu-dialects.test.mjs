import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";
import { applyTeluguDialect, teluguDialects } from "../assets/telugu-dialects.js";
import { createPreviewServer } from "../tools/serve.mjs";

const stories = await Promise.all(["jinx", "jinxed"].map(async (id) => {
  const file = id === "jinx" ? "te" : "jinxed-te";
  const read = async (name) => JSON.parse(await readFile(new URL(`../assets/books/${name}.json`, import.meta.url), "utf8"));
  return { id, file, standard: await read(file), adaptations: await read(`${file}-dialects`) };
}));

test("regional editions preserve every story block and leave Standard Telugu unchanged", () => {
  assert.deepEqual(Object.keys(teluguDialects), ["standard", "telangana", "rayalaseema"]);
  for (const { standard, adaptations } of stories) {
    const snapshot = structuredClone(standard);
    assert.equal(applyTeluguDialect(standard, null, "standard"), standard);
    for (const dialect of ["telangana", "rayalaseema"]) {
      const edition = applyTeluguDialect(standard, adaptations, dialect);
      assert.equal(edition.language, "te");
      assert.equal(edition.dialect, dialect);
      assert.equal(edition.chapters.length, standard.chapters.length);
      edition.chapters.forEach((chapter, index) => {
        const original = standard.chapters[index];
        const changes = new Map(adaptations.chapters[index].passages.map(([block, tg, rs]) => [block, dialect === "telangana" ? tg : rs]));
        assert.equal(chapter.id, original.id);
        assert.equal(chapter.blocks.length, original.blocks.length);
        chapter.blocks.forEach((block, i) => {
          assert.equal(block.kind, original.blocks[i].kind);
          assert.equal(block.text, changes.get(i) ?? original.blocks[i].text);
          assert.deepEqual(block.text.match(/[0-9]+/g), original.blocks[i].text.match(/[0-9]+/g), "Dates and numbers remain unchanged");
          assert.equal((block.text.match(/[“”]/g) ?? []).join(""), (original.blocks[i].text.match(/[“”]/g) ?? []).join(""), "Keep dialogue boundaries");
        });
        assert.ok(changes.size >= 7, `${chapter.id} has authored regional dialogue`);
        assert.notDeepEqual(chapter.blocks, original.blocks);
      });
    }
    assert.deepEqual(standard, snapshot);
  }
});

test("dialect validation rejects missing, mismatched, incomplete and malformed content", () => {
  const { standard, adaptations } = stories[0];
  assert.throws(() => applyTeluguDialect(standard, adaptations, "unknown"), /Unsupported/);
  assert.throws(() => applyTeluguDialect({ language: "en" }, adaptations, "telangana"), /require a Telugu/);
  for (const corrupt of [
    () => null,
    (data) => ({ ...data, title: "JINXED" }),
    (data) => ({ ...data, chapters: data.chapters.slice(1) }),
    (data) => { data.chapters[0].blockCount--; return data; },
    (data) => { data.chapters[0].passages = []; return data; },
    (data) => { data.chapters[0].passages[0][0] = -1; return data; },
    (data) => { data.chapters[0].passages[0][0] = 0; return data; },
    (data) => { data.chapters[0].passages[0][1] = ""; return data; },
    (data) => { data.chapters[0].passages[0][2] = "English fallback"; return data; },
    (data) => { data.chapters[0].passages.push(data.chapters[0].passages[0]); return data; },
  ]) {
    assert.throws(() => applyTeluguDialect(standard, corrupt(structuredClone(adaptations)), "telangana"), /Invalid|Incomplete/);
  }
});

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

async function ready(page) {
  await page.waitForFunction(() => document.querySelector("#reader").open &&
    document.querySelector("#book").getAttribute("aria-busy") === "false" &&
    !document.querySelector("#book").dataset.turning &&
    !document.querySelector("#reader-state").textContent);
}

async function openStory(page, id) {
  await page.goto(origin + (id === "jinxed" ? "jinxed.html" : ""));
  if (id === "jinxed") {
    await page.locator("#unlock-archive").click();
    await page.locator("#archive-code").fill("JINXED");
    await page.locator(".archive-code-dialog button[type=submit]").click();
  }
  await page.locator(id === "jinx" ? "#begin-reading" : "#begin-jinxed").click();
  await ready(page);
}

async function newPage(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: "reduce", ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  return page;
}

for (const story of stories) {
  for (const dialect of ["telangana", "rayalaseema"]) {
    test(`${story.id} ${dialect}: every rendered paragraph survives pagination`, { timeout: 120000 }, async (t) => {
      const page = await newPage(t);
      await openStory(page, story.id);
      assert.equal(await page.locator("#book-dialect").isVisible(), false);
      await page.locator("#book-language").selectOption("te");
      await ready(page);
      assert.equal(await page.locator("#book-dialect").inputValue(), "standard");
      await page.locator("#book-dialect").selectOption(dialect);
      await ready(page);
      assert.equal(await page.locator("#book").getAttribute("lang"), "te");
      assert.equal(await page.locator("#book").getAttribute("data-dialect"), dialect);
      const expected = applyTeluguDialect(story.standard, story.adaptations, dialect);
      for (const [index, chapter] of expected.chapters.entries()) {
        await page.locator("#reader-chapter").selectOption(String(index));
        await ready(page);
        const actual = chapter.blocks.map(() => "");
        const count = Number((await page.locator("#book-page .book-folio").textContent()).split("/").at(-1));
        for (let i = 0; i < count; i++) {
          const result = await page.locator("#book-page .book-page-text").evaluate((text) => ({
            clipped: text.scrollHeight > text.clientHeight + 1,
            parts: [...text.querySelectorAll("[data-block]")].map((part) => ({
              block: Number(part.dataset.block), text: part.tagName === "HR" ? "***" : part.textContent,
            })),
          }));
          assert.equal(result.clipped, false, `${chapter.id}/${i}`);
          for (const part of result.parts) actual[part.block] += part.text;
          if (i < count - 1) {
            await page.locator("#next-page").evaluate((button) => button.click());
            await ready(page);
          }
        }
        assert.deepEqual(actual, chapter.blocks.map(({ text }) => text));
      }
      assert.equal(await page.locator("#next-page").isDisabled(), true);
      if (story.id === "jinx") {
        assert.match(await page.locator("#download-epub").textContent(), /ప్రామాణిక తెలుగు/);
        assert.ok((await page.locator("#download-epub").getAttribute("href")).endsWith("jinx-te.epub"));
      } else assert.equal(await page.locator("#download-epub").count(), 0);
      await page.reload();
      await page.locator(story.id === "jinx" ? "#begin-reading" : "#begin-jinxed").click();
      await ready(page);
      assert.equal(await page.locator("#book-language").inputValue(), "te");
      assert.equal(await page.locator("#book-dialect").inputValue(), dialect);
      assert.equal(await page.locator("#book").getAttribute("data-dialect"), dialect);
    });
  }
}

test("dialect switching preserves the chapter/paragraph, hides for other languages, and restores standard text on mobile", async (t) => {
  const page = await newPage(t, { viewport: { width: 390, height: 844 } });
  await openStory(page, "jinx");
  await page.locator("#book-language").selectOption("te");
  await ready(page);
  await page.locator("#reader-chapter").selectOption("3");
  await ready(page);
  await page.locator("#next-page").click();
  await ready(page);
  const anchor = await page.locator("#book-page [data-block]").first().getAttribute("data-block");
  for (const dialect of ["telangana", "rayalaseema", "standard"]) {
    await page.locator("#book-dialect").selectOption(dialect);
    await ready(page);
    assert.equal(await page.locator("#reader-chapter").inputValue(), "3");
    assert.equal(await page.locator(`#book-page [data-block="${anchor}"]`).count(), 1);
    const geometry = await page.locator("#reader").evaluate((reader) => {
      const text = reader.querySelector(".book-page-text");
      return { overflow: reader.scrollWidth > innerWidth, clipped: text.scrollHeight > text.clientHeight + 1 };
    });
    assert.deepEqual(geometry, { overflow: false, clipped: false });
  }
  const parts = await page.locator("#book-page [data-block]").evaluateAll((parts) => parts.map((p) => ({
    block: Number(p.dataset.block), offset: Number(p.dataset.offset), text: p.textContent,
  })));
  for (const part of parts) assert.equal(stories[0].standard.chapters[3].blocks[part.block].text.slice(part.offset, part.offset + part.text.length), part.text);
  await page.locator("#book-dialect").selectOption("telangana");
  await ready(page);
  await page.locator("#book-language").selectOption("en");
  await ready(page);
  assert.equal(await page.locator("#book-dialect").isVisible(), false);
  assert.equal(await page.locator("#download-epub").textContent(), "EPUB");
  await page.locator("#book-language").selectOption("te");
  await ready(page);
  assert.equal(await page.locator("#book-dialect").inputValue(), "telangana");
});

test("both readers report failed dialect loads, retry, and keep preferences independent", async (t) => {
  const page = await newPage(t);
  for (const story of stories) {
    await openStory(page, story.id);
    await page.locator("#book-language").selectOption("te");
    await ready(page);
    assert.equal(await page.locator("#book-dialect").inputValue(), "standard");
    const path = `**/${story.file}-dialects.json`;
    await page.route(path, (route) => route.fulfill({ status: 404, body: "Missing" }));
    await page.locator("#book-dialect").selectOption("rayalaseema");
    await page.locator("#reader-state .retry-button").waitFor();
    assert.match(await page.locator("#reader-state").textContent(), /HTTP 404/);
    assert.equal(await page.locator("#next-page").isDisabled(), true);
    await page.unroute(path);
    await page.locator("#reader-state .retry-button").click();
    await ready(page);
    assert.equal(await page.locator("#book").getAttribute("data-dialect"), "rayalaseema");
  }
  assert.deepEqual(await page.evaluate(() => [
    localStorage.getItem("jinx-book-dialect"), localStorage.getItem("jinxed-book-dialect"),
  ]), ["rayalaseema", "rayalaseema"]);
});

test("invalid saved dialects reset visibly instead of selecting an unavailable edition", async (t) => {
  const page = await newPage(t);
  await page.goto(origin);
  await page.evaluate(() => localStorage.setItem("jinx-book-dialect", "unknown"));
  await openStory(page, "jinx");
  assert.equal(await page.locator("#book-dialect").inputValue(), "standard");
  assert.match(await page.locator("body").textContent(), /saved Telugu dialect was invalid/);
  assert.equal(await page.evaluate(() => localStorage.getItem("jinx-book-dialect")), null);
});
