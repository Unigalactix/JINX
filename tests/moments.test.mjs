import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { chromium } from "playwright";
import { createPreviewServer } from "../tools/serve.mjs";
import { moments, identityNotes, lunarState, chooseOtherIdentity, bladeState, stormState, thunderCues } from "../assets/moments.js";
import { identities, chapters } from "../assets/content.js";

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

async function openMoments(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], "No uncaught errors in scene interactions"));
  await page.goto(origin);
  await page.locator("#moment-screen").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector("#moments-experience").hidden);
  return page;
}

async function scrub(page, value) {
  await page.locator("#moment-progress").evaluate((input, value) => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

test("moments cover six canonical chapters with responsible identities and timeline dates", () => {
  assert.equal(moments.length, 6);
  assert.equal(new Set(moments.map((scene) => scene.id)).size, 6);
  assert.ok(moments.every((scene) => chapters[scene.chapter] && scene.duration >= 14000));
  assert.deepEqual(moments.filter((scene) => scene.spoiler).map((scene) => scene.id), ["blade", "rain", "zan"]);
  assert.equal(identityNotes.length, identities.length);
  assert.match(identityNotes[11], /Please keep tomorrow/);
  assert.match(moments.find((scene) => scene.id === "identities").canon, /DID is not a cause of violence/);
  assert.equal(lunarState(0, false).year, 2165);
  assert.equal(lunarState(8 / 15, false).year, 2173);
  assert.equal(lunarState(1, false).impact, false);
  assert.equal(lunarState(12 / 15 - .001, true).impact, false);
  assert.equal(lunarState(12 / 15, true).impact, true);
  assert.match(lunarState(12 / 15, true).label, /21 DEC 2177/);
  assert.equal(lunarState(1, true).year, 2180);
  assert.throws(() => lunarState(NaN, true), /progress/);
  assert.throws(() => lunarState(1.1, true), /progress/);
  for (let i = 0; i < 12; i++) {
    const choices = new Set(Array.from({ length: 11 }, (_, j) => chooseOtherIdentity(i, j / 11)));
    assert.equal(choices.size, 11);
    assert.equal(choices.has(i), false);
  }
});

test("scene animation plays, pauses, scrubs, completes, replays and stops offscreen", async (t) => {
  const page = await openMoments(t);
  assert.equal(await page.locator(".moment-tab").count(), 6);
  assert.equal(await page.locator("#moment-play").getAttribute("aria-pressed"), "false");
  const initial = await page.locator("[data-moon]").getAttribute("transform");
  await page.locator("#moment-play").click();
  await page.waitForFunction(() => Number(document.querySelector("#moment-screen").dataset.progress) > .006);
  assert.notEqual(await page.locator("[data-moon]").getAttribute("transform"), initial);
  await page.locator("#moment-play").click();
  const stopped = await page.locator("#moment-screen").getAttribute("data-progress");
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#moment-screen").getAttribute("data-progress"), stopped);
  await scrub(page, 999);
  await page.locator("#moment-play").click();
  await page.waitForFunction(() => document.querySelector("#moment-screen").dataset.progress === "1.000" &&
    document.querySelector("#moment-play").getAttribute("aria-pressed") === "false");
  assert.equal(await page.locator("#moment-play").getAttribute("aria-pressed"), "false");
  await page.locator("#moment-replay").click();
  assert.equal(await page.locator("#moment-play").getAttribute("aria-pressed"), "true");
  await page.locator("#signals").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#moment-play").getAttribute("aria-pressed") === "false");
});

test("spoiler setting gates art and descriptions, and lunar forecast never implies the wrong crash date", async (t) => {
  const page = await openMoments(t);
  await scrub(page, 1000);
  assert.equal(await page.locator("[data-impact]").getAttribute("opacity"), "0");
  assert.match(await page.locator("#moment-readout").textContent(), /2180.*FORECAST/s);
  await page.locator('[data-moment="blade"]').click();
  assert.equal(await page.locator("#moment-art svg").count(), 0);
  assert.equal(await page.locator("#moment-play").isDisabled(), true);
  assert.doesNotMatch(await page.locator("#moment-description").textContent(), /all ten thousand are dead/);
  await page.locator("#moment-reveal").click();
  assert.equal(await page.locator("#spoiler-toggle").isChecked(), true);
  assert.equal(await page.locator("#spoiler-label").textContent(), "on");
  assert.equal(await page.locator("#moment-art svg").count(), 1);
  assert.match(await page.locator("#moment-description").textContent(), /all ten thousand are dead/);
  assert.equal(await page.locator("#mx-ranks").evaluate((pattern) => {
    const field = document.querySelector('rect[fill="url(#mx-ranks)"]');
    return (Number(field.getAttribute("width")) / Number(pattern.getAttribute("width"))) *
      (Number(field.getAttribute("height")) / Number(pattern.getAttribute("height")));
  }), 10000);
  await scrub(page, 1000);
  assert.equal(await page.locator("[data-ranks-width]").getAttribute("width"), "0");
  await page.locator('[data-moment="moon"]').click();
  await scrub(page, 800);
  assert.match(await page.locator("#moment-readout").textContent(), /21 DEC 2177/);
  assert.equal(await page.locator("[data-moon]").getAttribute("opacity"), "0");
  assert.ok(Number(await page.locator("[data-impact]").getAttribute("opacity")) > 0);
  await page.locator('[data-moment="rain"]').click();
  assert.equal(await page.locator("[data-drop]").count(), 85);
  assert.match(await page.locator("#moment-description").textContent(), /backward, not forward/);
  await page.locator("#moment-play").click();
  await page.locator("#spoiler-toggle").uncheck();
  assert.equal(await page.locator("#moment-art svg").count(), 0);
  assert.equal(await page.locator("#moment-play").getAttribute("aria-pressed"), "false");
  assert.equal(await page.locator("#moment-lock").isVisible(), true);
});

test("identities support all twelve names, nonrepeating random focus and chapter reader integration", async (t) => {
  const page = await openMoments(t);
  await page.locator('[data-moment="identities"]').click();
  assert.equal(await page.locator("#moment-identities button").count(), 12);
  assert.equal(await page.locator("[data-identity-node]").count(), 12);
  for (let i = 0; i < identities.length; i++) {
    await page.locator(`[data-identity="${i}"]`).click();
    assert.equal(await page.locator("#moment-line").textContent(), identityNotes[i]);
    assert.equal(await page.locator("#moment-identities [aria-pressed=true]").count(), 1);
  }
  const before = await page.locator("#moment-readout").textContent();
  await page.locator("#moment-random").click();
  assert.notEqual(await page.locator("#moment-readout").textContent(), before);
  await page.locator("#moment-screen").scrollIntoViewIfNeeded();
  await page.locator("#moment-play").click();
  await page.locator("#moment-read").click();
  await page.waitForFunction(() => document.querySelector("#reader").open && !document.querySelector("#reader-state").textContent);
  assert.equal(await page.locator("#reader-chapter").inputValue(), "3");
  assert.equal(await page.locator("#moment-play").getAttribute("aria-pressed"), "false");
  await page.locator("#close-reader").click();
  assert.equal(await page.evaluate(() => document.activeElement.id), "moment-read");
});

test("six scenes are responsive and reduced-motion keeps manual exploration without autoplay", async (t) => {
  const page = await openMoments(t, { viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.locator("#spoiler-toggle").check();
  for (const moment of moments) {
    await page.locator(`[data-moment="${moment.id}"]`).click();
    assert.equal(await page.locator("#moment-art svg").count(), 1);
    assert.equal(await page.locator("#moment-play").isDisabled(), true);
    await scrub(page, 570);
    assert.equal(await page.locator("#moment-screen").getAttribute("data-progress"), "0.570");
    assert.equal(await page.locator("#moment-play").getAttribute("aria-pressed"), "false");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  assert.equal(await page.locator("[data-zan-moons] circle").count(), 2);
  await page.locator('[data-moment="zan"]').press("Home");
  assert.equal(await page.locator('[data-moment="moon"]').getAttribute("aria-pressed"), "true");
  await page.locator('[data-moment="moon"]').press("ArrowLeft");
  assert.equal(await page.locator('[data-moment="zan"]').getAttribute("aria-pressed"), "true");
  await page.setViewportSize({ width: 320, height: 740 });
  for (const moment of moments) {
    await page.locator(`[data-moment="${moment.id}"]`).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
      `${moment.id} must fit a 320px-wide viewport`);
  }
});

test("REDOVERSE reference is external, accessible, and does not replace JINX canon", async (t) => {
  const page = await openMoments(t);
  const link = page.locator('.redo-reference a');
  assert.equal(await link.getAttribute("href"), "https://unigalactix.github.io/REDOVERSE/");
  assert.equal(await link.getAttribute("target"), "_blank");
  assert.match(await link.getAttribute("rel"), /noopener/);
  assert.match(await link.textContent(), /opens in a new tab/);
  assert.match(await page.locator(".redo-reference").textContent(), /35-light-year.*REDO Volume 1/);
});

test("REDO sequel reveal adds four moons, two suns and both parts without changing the JINX scene", async (t) => {
  const page = await openMoments(t);
  await page.locator(".redo-volume").scrollIntoViewIfNeeded();
  assert.equal(await page.locator("#redo-volume-details").isVisible(), false);
  assert.equal(await page.locator("#redo-volume-teaser").isVisible(), true);
  await page.locator("#redo-reveal").click();
  assert.equal(await page.locator("#spoiler-toggle").isChecked(), true);
  assert.equal(await page.locator("#redo-volume-details").isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), "redo-discovery-title");
  assert.equal(await page.locator("[data-redo-moon]").count(), 4);
  assert.equal(await page.locator("[data-redo-sun]").count(), 2);
  assert.deepEqual(await page.locator(".redo-parts h4").allTextContents(), ["Rage of Rak", "Wrath of God (Theo)"]);
  assert.match(await page.locator(".redo-discovery").textContent(), /After landing on Zan and fully awakening.*four moons, not just two.*two suns/s);
  assert.match(await page.locator(".redo-discovery").textContent(), /without changing JINX/);
  await page.setViewportSize({ width: 320, height: 740 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator("#spoiler-toggle").uncheck();
  assert.equal(await page.locator("#redo-volume-details").isVisible(), false);
  assert.equal(await page.locator("#redo-volume-teaser").isVisible(), true);
  await page.locator("#spoiler-toggle").check();
  assert.equal(await page.locator("#redo-volume-details").isVisible(), true);
  await page.locator('[data-moment="zan"]').click();
  assert.equal(await page.locator("[data-zan-moons] circle").count(), 2);
  assert.match(await page.locator("#moment-canon").textContent(), /JINX scene shows Agape and Ales.*REDO Volume 1 later reveals four moons and two suns/s);
  assert.doesNotMatch(await page.locator("#moment-canon").textContent(), /exactly two moons/);
});

test("blade time-lapse separates sunrise, noon combat, and a still sunset", () => {
  const dawn = bladeState(0);
  const noon = bladeState(.5);
  const fight = bladeState(.65);
  const sunset = bladeState(1);
  assert.equal(dawn.phase, "SUNRISE");
  assert.equal(dawn.clock, "06:00");
  assert.equal(dawn.blood, 0);
  assert.equal(bladeState(.49).combat, 0);
  assert.equal(noon.clock, "12:00");
  assert.ok(noon.sunY < dawn.sunY);
  assert.equal(noon.daylight, 1);
  assert.ok(fight.intensity > .9);
  assert.notEqual(fight.x, bladeState(.66).x);
  assert.ok(fight.blood > 0);
  assert.equal(sunset.clock, "18:00");
  assert.equal(sunset.phase, "SUNSET");
  assert.equal(sunset.combat, 1);
  assert.equal(sunset.intensity, 0);
  assert.equal(sunset.dusk, 1);
  assert.ok(sunset.sunX > noon.sunX);
  assert.ok(sunset.sunY > noon.sunY);
  assert.throws(() => bladeState(-1), /progress/);
  assert.throws(() => bladeState(NaN), /progress/);
  for (let i = 0; i < thunderCues.length; i++) {
    assert.equal(stormState(thunderCues[i]).light, 0);
    assert.ok(stormState(thunderCues[i] + .575).light > .99);
    assert.equal(stormState(thunderCues[i] + 1.2).light, 0);
    if (i > 0) assert.ok(thunderCues[i] - thunderCues[i - 1] >= 5);
  }
});

test("blade scrubbing renders changing sky, speed trails and scoped blood, then resets cleanly", async (t) => {
  const page = await openMoments(t);
  await page.locator('[data-moment="blade"]').click();
  await page.locator("#moment-reveal").click();
  const sunrise = await page.locator("[data-blade-sun]").getAttribute("transform");
  assert.equal(await page.locator("[data-blood-screen]").getAttribute("opacity"), "0");
  assert.equal(await page.locator("[data-ranks-width]").getAttribute("width"), "800");
  await scrub(page, 500);
  assert.notEqual(await page.locator("[data-blade-sun]").getAttribute("transform"), sunrise);
  assert.equal(await page.locator("[data-blade-day]").getAttribute("opacity"), "1");
  await scrub(page, 650);
  const combat = await page.locator("[data-blade-figure]").getAttribute("transform");
  assert.equal(await page.locator("[data-blade-trail]").count(), 5);
  assert.equal(await page.locator("[data-blade-opponent]").count(), 7);
  assert.ok(Number(await page.locator("[data-blade-trail]").first().getAttribute("opacity")) > 0);
  assert.ok(Number(await page.locator("[data-blood-screen]").getAttribute("opacity")) > 0);
  await scrub(page, 660);
  assert.notEqual(await page.locator("[data-blade-figure]").getAttribute("transform"), combat);
  await scrub(page, 1000);
  assert.equal(await page.locator("[data-blade-dusk]").getAttribute("opacity"), "1");
  assert.equal(await page.locator("[data-ranks-width]").getAttribute("width"), "0");
  assert.equal(await page.locator("[data-clean-blade]").getAttribute("fill"), "url(#mx-blade)");
  assert.equal(await page.locator("[data-blade-trail]").first().getAttribute("opacity"), "0");
  assert.match(await page.locator("#moment-readout").textContent(), /SUNSET.*CLEAN/s);
  await scrub(page, 0);
  assert.equal(await page.locator("[data-blood-screen]").getAttribute("opacity"), "0");
  await page.setViewportSize({ width: 320, height: 740 });
  await scrub(page, 750);
  const overlay = await page.locator("#moment-blood-overlay svg").boundingBox();
  const scene = await page.locator("#moment-screen").boundingBox();
  assert.ok(overlay.x >= scene.x && overlay.x + overlay.width <= scene.x + scene.width);
  await page.locator('[data-moment="rain"]').click();
  assert.equal(await page.locator("#moment-blood-overlay svg").count(), 0);
  await page.locator('[data-moment="blade"]').click();
  await page.locator("#spoiler-toggle").uncheck();
  assert.equal(await page.locator("#moment-blood-overlay svg").count(), 0);
});

test("rain lightning is deterministic; optional real Web Audio thunder stops with the scene", async (t) => {
  const page = await openMoments(t);
  await page.evaluate(() => {
    const NativeAudioContext = window.AudioContext;
    window.testAudioContexts = [];
    window.testAudioBuffers = [];
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) { super(...args); window.testAudioContexts.push(this); }
      createBuffer(...args) { const buffer = super.createBuffer(...args); window.testAudioBuffers.push(buffer); return buffer; }
    };
  });
  await page.locator('[data-moment="rain"]').click();
  await page.locator("#moment-reveal").click();
  assert.equal(await page.locator("[data-lightning-strike]").count(), 3);
  assert.equal(await page.locator("#moment-thunder").getAttribute("aria-pressed"), "false");
  assert.equal(await page.evaluate(() => window.testAudioContexts.length), 0);
  await scrub(page, 186);
  assert.ok(Number(await page.locator('[data-lightning-strike="0"]').getAttribute("opacity")) > .7);
  assert.equal(await page.locator("#moment-screen").getAttribute("data-thunder-active"), "false");
  await scrub(page, 400);
  assert.equal(await page.locator('[data-lightning-strike="0"]').getAttribute("opacity"), "0");
  await page.locator("#moment-thunder").click();
  await page.waitForFunction(() => document.querySelector("#moment-thunder").getAttribute("aria-pressed") === "true");
  assert.equal(await page.evaluate(() => window.testAudioContexts[0].state), "running");
  assert.ok(await page.evaluate(() => window.testAudioBuffers[0].getChannelData(0).some((sample) => Math.abs(sample) > .01)));
  await scrub(page, 175);
  await page.locator("#moment-play").click();
  await page.waitForFunction(() => document.querySelector("#moment-screen").dataset.thunderActive === "true");
  await page.locator("#moment-play").click();
  assert.equal(await page.locator("#moment-screen").getAttribute("data-thunder-active"), "false");
  await scrub(page, 175);
  await page.locator("#moment-play").click();
  await page.waitForFunction(() => document.querySelector("#moment-screen").dataset.thunderActive === "true");
  await page.locator("#signals").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#moment-screen").dataset.thunderActive === "false");
  await page.locator("#moment-screen").scrollIntoViewIfNeeded();
  await page.locator("#moment-thunder").click();
  assert.equal(await page.locator("#moment-thunder").getAttribute("aria-pressed"), "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector("#moment-thunder").disabled);
  assert.equal(await page.locator("#moment-thunder").isDisabled(), true);
  await scrub(page, 186);
  assert.equal(await page.locator("#moment-screen").getAttribute("data-thunder-active"), "false");
  await page.locator('[data-moment="zan"]').click();
  assert.equal(await page.locator("[data-lightning-strike]").count(), 0);
  assert.equal(await page.locator("#moment-thunder").isVisible(), false);
});

test("unavailable thunder audio reports an error without breaking the rain scene", async (t) => {
  const page = await openMoments(t);
  await page.evaluate(() => { window.AudioContext = undefined; });
  await page.locator('[data-moment="rain"]').click();
  await page.locator("#moment-reveal").click();
  await page.locator("#moment-thunder").click();
  assert.match(await page.locator("#moment-audio-status").textContent(), /does not support Web Audio/);
  assert.equal(await page.locator("#moment-thunder").getAttribute("aria-pressed"), "false");
  await scrub(page, 186);
  assert.ok(Number(await page.locator('[data-lightning-strike="0"]').getAttribute("opacity")) > .7);
});
