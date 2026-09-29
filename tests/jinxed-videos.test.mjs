import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { moments } from "../assets/jinxed-content.js";

const root = new URL("../", import.meta.url);
const names = ["approach", "breakup", "ring"];
const files = new Map([
  ["assets/jinxed-videos.js", "text/javascript"],
  ["assets/jinxed-content.js", "text/javascript"],
  ["assets/jinxed-videos.css", "text/css"],
  ...names.flatMap((name) => [["webm", "video/webm"], ["png", "image/png"], ["vtt", "text/vtt"]]
    .map(([ext, mime]) => [`assets/jinxed-videos/${name}.${ext}`, mime])),
]);
let browser, server, origin;

before(async () => {
  browser = await chromium.launch({ headless: true });
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/JINX/") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(`<!doctype html><html lang="en"><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <link rel="stylesheet" href="./assets/jinxed-videos.css">
        <title>JINXED video test</title><div id="films"></div>
        <script type="module">
          import {setupJinxedVideos} from "./assets/jinxed-videos.js";
          import {moments} from "./assets/jinxed-content.js";
          window.openedChapters = [];
          window.films = setupJinxedVideos(document.querySelector("#films"),
            {moments, openChapter: index => window.openedChapters.push(index)});
        </script></html>`);
      return;
    }
    const path = pathname.slice("/JINX/".length);
    if (!pathname.startsWith("/JINX/") || !files.has(path)) {
      response.writeHead(404); response.end(); return;
    }
    try {
      const content = await readFile(new URL(path, root));
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? "");
      if (range) {
        const start = Number(range[1]);
        const end = Math.min(range[2] ? Number(range[2]) : content.length - 1, content.length - 1);
        if (start > end) {
          response.writeHead(416, { "Content-Range": `bytes */${content.length}` });
          response.end(); return;
        }
        response.writeHead(206, {
          "Content-Type": files.get(path), "Content-Length": end - start + 1,
          "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${content.length}`,
        });
        response.end(content.subarray(start, end + 1)); return;
      }
      response.writeHead(200, {
        "Content-Type": files.get(path), "Content-Length": content.length,
        "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes",
      });
      response.end(content);
    } catch {
      response.writeHead(404); response.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}/JINX/`;
});
after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
});

async function openFilms(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], "No uncaught errors in video experience"));
  await page.goto(origin);
  await page.waitForFunction(() => !!window.films);
  return page;
}

async function loaded(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector("video");
    return video.readyState >= 2 && Number.isFinite(video.duration);
  });
}

test("all three films are durable WebM binaries with local posters and timed descriptions", async () => {
  assert.equal(moments.length, 3);
  for (const name of names) {
    const data = await readFile(new URL(`assets/jinxed-videos/${name}.webm`, root));
    assert.deepEqual([...data.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3], "EBML/WebM signature");
    assert.ok(data.length > 20000, "Video contains encoded frames, not an empty placeholder");
    const poster = await readFile(new URL(`assets/jinxed-videos/${name}.png`, root));
    assert.deepEqual([...poster.subarray(0, 4)], [137, 80, 78, 71]);
    const captions = await readFile(new URL(`assets/jinxed-videos/${name}.vtt`, root), "utf8");
    assert.match(captions, /^WEBVTT/);
    assert.equal((captions.match(/-->/g) ?? []).length, 3);
    assert.match(captions, /00:00:12.000/);
  }
});

test("each real video decodes, advances frames, seeks, pauses, ends and replays", { timeout: 60000 }, async (t) => {
  const page = await openFilms(t);
  for (const [index, name] of names.entries()) {
    await page.locator(".jinxed-video-scene").nth(index).click();
    await loaded(page);
    const metadata = await page.locator("video").evaluate((video) => ({
      src: video.currentSrc, width: video.videoWidth, height: video.videoHeight,
      duration: video.duration, paused: video.paused, autoplay: video.autoplay,
      controls: video.controls, inline: video.playsInline,
    }));
    assert.equal(metadata.src, `${origin}assets/jinxed-videos/${name}.webm`);
    assert.deepEqual([metadata.width, metadata.height], [960, 540]);
    assert.ok(metadata.duration >= 11.8 && metadata.duration <= 12.6, "Film is approximately 12 seconds");
    assert.equal(metadata.paused, true);
    assert.equal(metadata.autoplay, false);
    assert.equal(metadata.controls, true);
    assert.equal(metadata.inline, true);
    await page.locator("video").evaluate(async (video) => {
      video.textTracks[0].mode = "showing";
      await video.play();
    });
    await page.waitForFunction(() => document.querySelector("video").currentTime > .3);
    const first = await page.locator("video").evaluate((video) => {
      const canvas = document.createElement("canvas");
      canvas.width = 960; canvas.height = 540;
      canvas.getContext("2d").drawImage(video, 0, 0);
      return canvas.toDataURL();
    });
    await page.locator("video").evaluate((video) => { video.pause(); video.currentTime = 6; });
    await page.waitForFunction(() => {
      const video = document.querySelector("video");
      return !video.seeking && video.currentTime >= 6 && video.readyState >= 2;
    }, null, { timeout: 5000 }).catch(async (error) => {
      const state = await page.locator("video").evaluate((video) => ({
        time: video.currentTime, seeking: video.seeking, ready: video.readyState, error: video.error?.message,
      }));
      throw new Error(`${name}: seeking failed: ${JSON.stringify(state)}`, { cause: error });
    });
    const later = await page.locator("video").evaluate((video) => {
      const canvas = document.createElement("canvas");
      canvas.width = 960; canvas.height = 540;
      canvas.getContext("2d").drawImage(video, 0, 0);
      return {
        image: canvas.toDataURL(), frames: video.getVideoPlaybackQuality().totalVideoFrames,
        cues: [...video.textTracks[0].cues].map((cue) => cue.text),
      };
    });
    assert.notEqual(first, later.image, "Frames visibly change throughout the film");
    assert.ok(later.frames > 1, "Browser decoded multiple video frames");
    assert.equal(later.cues.length, 3, "Local caption file loaded successfully");
    const pausedAt = await page.locator("video").evaluate((video) => video.currentTime);
    await page.waitForTimeout(100);
    assert.equal(await page.locator("video").evaluate((video) => video.currentTime), pausedAt);
    await page.locator("video").evaluate(async (video) => {
      video.currentTime = 11.5;
      await video.play();
    });
    await page.waitForFunction(() => document.querySelector("video").ended);
    await page.locator("video").evaluate(async (video) => { video.currentTime = 0; await video.play(); });
    await page.waitForFunction(() => {
      const video = document.querySelector("video");
      return !video.paused && video.currentTime > .1 && video.currentTime < 2;
    });
    await page.locator("video").evaluate((video) => video.pause());
  }
});

test("scene selection is keyboard accessible, stops playback and opens the matching chapter", async (t) => {
  const page = await openFilms(t);
  for (const [index, moment] of moments.entries()) {
    await page.locator(".jinxed-video-scene").nth(index).focus();
    await page.keyboard.press("Enter");
    await loaded(page);
    assert.equal(await page.locator('.jinxed-video-scene[aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator(".jinxed-video-title").textContent(), moment.title);
    assert.equal(await page.locator(".jinxed-video-description").textContent(), moment.description);
    assert.equal(await page.locator("video").evaluate((video) => video.paused), true);
    await page.locator("video").evaluate((video) => video.play());
    await page.locator(".jinxed-video-chapter").click();
    assert.equal(await page.locator("video").evaluate((video) => video.paused), true);
  }
  assert.deepEqual(await page.evaluate(() => window.openedChapters), [0, 0, 1]);
  await page.locator("video").evaluate((video) => video.play());
  await page.locator(".jinxed-video-scene").first().click();
  await loaded(page);
  assert.equal(await page.locator("video").evaluate((video) => video.paused), true);
  assert.equal(await page.locator("video").evaluate((video) => video.currentTime), 0);
  await page.locator("video").evaluate((video) => video.play());
  await page.evaluate(() => window.films.pause());
  assert.equal(await page.locator("video").evaluate((video) => video.paused), true);
  await page.evaluate(() => { window.films.destroy(); window.films.destroy(); });
  assert.equal(await page.locator("#films > *").count(), 0);
});

test("mobile reduced-motion layout remains usable without autoplay and errors have a fallback", async (t) => {
  const page = await openFilms(t, { viewport: { width: 360, height: 1000 }, reducedMotion: "reduce" });
  await loaded(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator("video").evaluate((video) => video.paused), true);
  await page.locator("video").evaluate((video) => { video.src = "/missing.webm"; video.load(); });
  await page.waitForFunction(() => document.querySelector(".jinxed-video-status").textContent.includes("could not"));
  assert.match(await page.locator(".jinxed-video-download").getAttribute("href"), /approach\.webm$/);
  await page.locator(".jinxed-video-chapter").click();
  assert.deepEqual(await page.evaluate(() => window.openedChapters), [0]);
});

test("offscreen playback pauses without automatically resuming", async (t) => {
  const page = await openFilms(t);
  await loaded(page);
  await page.locator("video").evaluate((video) => video.play());
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "2000px";
    document.body.append(spacer);
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForFunction(() => document.querySelector("video").paused);
  await page.locator("video").scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  assert.equal(await page.locator("video").evaluate((video) => video.paused), true);
});

test("book-open and pagehide pause films, and destroy removes global listeners", async (t) => {
  const page = await openFilms(t);
  await loaded(page);
  for (const name of ["jinx:reader-open", "pagehide"]) {
    await page.locator("video").evaluate((video) => video.play());
    await page.evaluate((name) => {
      (name === "pagehide" ? window : document).dispatchEvent(new Event(name));
    }, name);
    assert.equal(await page.locator("video").evaluate((video) => video.paused), true);
  }
  const callsAfterDestroy = await page.evaluate(() => {
    const video = document.querySelector("video");
    window.films.destroy();
    let calls = 0;
    video.pause = () => { calls++; };
    document.dispatchEvent(new Event("jinx:reader-open"));
    window.dispatchEvent(new Event("pagehide"));
    document.dispatchEvent(new Event("visibilitychange"));
    return calls;
  });
  assert.equal(callsAfterDestroy, 0);
  assert.equal(await page.locator("#films > *").count(), 0);
});
