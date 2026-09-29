// Run: node tools/build-jinxed-videos.mjs. Uses the project's installed Playwright Chromium.
// All artwork is drawn here; there are no external media, fonts, or network requests.
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { chromium } from "playwright";

const output = new URL("../assets/jinxed-videos/", import.meta.url);
const duration = 12;
const fps = 24;
const scenes = [
  {
    name: "approach", title: "THE SLOWING APPROACH", date: "DECEMBER 2177",
    cues: [
      [0, 4, "The Moon moves inward toward Earth."],
      [4, 8, "Its inward motion slows. It is still approaching."],
      [8, 12, "Three recovered stations agree. The cause remains unknown."],
    ],
  },
  {
    name: "breakup", title: "THE BREAKING MOON", date: "21 DECEMBER 2177",
    cues: [
      [0, 4, "The Moon deforms. Fractures spread through its surface."],
      [4, 8, "Unequal fragments separate. Some descend and strike Earth."],
      [8, 12, "Other fragments miss the surface and remain in orbit."],
    ],
  },
  {
    name: "ring", title: "A RING AROUND EARTH", date: "2181–2182 / YEARS COMPRESSED",
    cues: [
      [0, 4, "Bound fragments continue their passage around Earth."],
      [4, 8, "Collisions and spreading fill broad, uneven debris lanes."],
      [8, 12, "A ring takes shape over years. Falling debris remains a hazard."],
    ],
  },
];

function element(id, ...parts) {
  const data = Buffer.concat(parts);
  let width = 1;
  while (data.length >= 2 ** (7 * width) - 1) width++;
  const size = Buffer.alloc(width);
  let remaining = data.length;
  for (let i = width - 1; i >= 0; i--) {
    size[i] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  size[0] |= 1 << (8 - width);
  return Buffer.concat([Buffer.from(id, "hex"), size, data]);
}
function integer(value) {
  const bytes = [];
  do { bytes.unshift(value % 256); value = Math.floor(value / 256); } while (value);
  return Buffer.from(bytes);
}
function webm(frames) {
  const uint = (id, value) => element(id, integer(value));
  const string = (id, value) => element(id, Buffer.from(value));
  const header = element("1a45dfa3", uint("4286", 1), uint("42f7", 1), uint("42f2", 4),
    uint("42f3", 8), string("4282", "webm"), uint("4287", 4), uint("4285", 2));
  const length = Buffer.alloc(8);
  length.writeDoubleBE(duration * 1000);
  const info = element("1549a966", uint("2ad7b1", 1000000), element("4489", length),
    string("4d80", "JINXED original films"), string("5741", "JINXED canvas / WebCodecs"));
  const tracks = element("1654ae6b", element("ae", uint("d7", 1), uint("73c5", 1),
    uint("83", 1), string("86", "V_VP9"), uint("23e383", Math.round(1e9 / fps)),
    element("e0", uint("b0", 960), uint("ba", 540))));
  const clusters = [];
  const cues = [];
  let position = info.length + tracks.length;
  for (let start = 0; start < frames.length; start += fps * 2) {
    const timestamp = Math.round(frames[start].timestamp / 1000);
    const blocks = frames.slice(start, start + fps * 2).map((frame) => {
      const header = Buffer.alloc(4);
      header[0] = 0x81;
      header.writeInt16BE(Math.round(frame.timestamp / 1000) - timestamp, 1);
      header[3] = frame.key ? 0x80 : 0;
      return element("a3", header, Buffer.from(frame.data, "base64"));
    });
    const cluster = element("1f43b675", uint("e7", timestamp), ...blocks);
    cues.push(element("bb", uint("b3", timestamp), element("b7", uint("f7", 1), uint("f1", position))));
    clusters.push(cluster);
    position += cluster.length;
  }
  return Buffer.concat([header, element("18538067", info, tracks, ...clusters, element("1c53bb6b", ...cues))]);
}

await mkdir(output, { recursive: true });
// Loopback is a secure context for WebCodecs. No external requests are made.
const server = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end('<!doctype html><canvas width="960" height="540"></canvas>');
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const c = canvas.getContext("2d", { alpha: false });
    let seed = 2177;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const stars = Array.from({ length: 220 }, () => [random() * 960, random() * 540, random()]);
    const debris = Array.from({ length: 240 }, () => ({
      angle: random() * Math.PI * 2, lane: random(), size: 1 + random() * 3,
      phase: random(), speed: .3 + random() * .6,
    }));
    const craters = Array.from({ length: 24 }, () => [random() * 1.4 - .7, random() * 1.4 - .7, .025 + random() * .10]);
    const tau = Math.PI * 2;
    const ease = (v) => Math.max(0, Math.min(1, v));
    function text(content, x, y, size = 16, color = "#b7c8d7") {
      c.fillStyle = color;
      c.font = `${size}px Arial, sans-serif`;
      c.fillText(content, x, y);
    }
    function line(points, color, width = 1) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.beginPath();
      points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.stroke();
    }
    function globe(x, y, r, t) {
      c.save();
      const glow = c.createRadialGradient(x, y, r * .85, x, y, r * 1.25);
      glow.addColorStop(0, "#3d91be44");
      glow.addColorStop(1, "#3d91be00");
      c.fillStyle = glow;
      c.beginPath(); c.arc(x, y, r * 1.25, 0, tau); c.fill();
      c.beginPath(); c.arc(x, y, r, 0, tau); c.clip();
      const ocean = c.createRadialGradient(x - r * .4, y - r * .4, 0, x, y, r);
      ocean.addColorStop(0, "#4388ab");
      ocean.addColorStop(.75, "#163e5b");
      ocean.addColorStop(1, "#07131f");
      c.fillStyle = ocean; c.fillRect(x - r, y - r, r * 2, r * 2);
      const continents = [
        [[-.85, -.42], [-.6, -.71], [-.22, -.55], [-.28, -.3], [-.05, -.1], [-.24, .08], [-.47, -.03], [-.5, -.26]],
        [[-.26, .10], [.01, .17], [.06, .39], [-.15, .7], [-.28, .88], [-.34, .44]],
        [[.3, -.64], [.62, -.68], [.94, -.41], [.8, -.08], [.52, .01], [.46, .31], [.26, .47], [.14, .12], [.24, -.12], [.03, -.36]],
        [[.66, .48], [.94, .42], [1.05, .7], [.72, .77]],
      ];
      c.fillStyle = "#688b83";
      for (const polygon of continents) {
        c.beginPath();
        polygon.forEach(([px, py], i) => {
          const sx = x + px * r + Math.sin(t * .08) * r * .025;
          i ? c.lineTo(sx, y + py * r) : c.moveTo(sx, y + py * r);
        });
        c.closePath(); c.fill();
      }
      c.globalAlpha = .22;
      c.strokeStyle = "#effbff"; c.lineWidth = r * .035;
      for (let i = 0; i < 6; i++) {
        c.beginPath(); c.ellipse(x - r * .1, y + (i - 2.5) * r * .26, r * .91, r * .12, -.12, 0, Math.PI); c.stroke();
      }
      c.globalAlpha = 1;
      const shade = c.createLinearGradient(x - r, y, x + r, y);
      shade.addColorStop(0, "#00102000"); shade.addColorStop(.45, "#00102000"); shade.addColorStop(1, "#020811ee");
      c.fillStyle = shade; c.fillRect(x - r, y - r, r * 2, r * 2);
      c.restore();
      c.strokeStyle = "#8ed3f766"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r, 0, tau); c.stroke();
    }
    function moon(x, y, r, stretch = 1, cracks = 0) {
      c.save(); c.translate(x, y); c.scale(stretch, 1);
      c.beginPath(); c.arc(0, 0, r, 0, tau); c.clip();
      const fill = c.createRadialGradient(-r * .45, -r * .4, 0, 0, 0, r * 1.15);
      fill.addColorStop(0, "#dfdace"); fill.addColorStop(.55, "#95958f"); fill.addColorStop(1, "#252c35");
      c.fillStyle = fill; c.fillRect(-r, -r, r * 2, r * 2);
      for (const [cx, cy, size] of craters) {
        c.fillStyle = "#303d4744"; c.strokeStyle = "#e3e1d333";
        c.beginPath(); c.arc(cx * r, cy * r, size * r, 0, tau); c.fill(); c.stroke();
      }
      if (cracks > 0) {
        c.globalAlpha = cracks;
        line([[-r, -.35 * r], [-.35 * r, -.18 * r], [-.14 * r, .1 * r], [.3 * r, -.08 * r], [r, .2 * r]], "#f5c585", 2);
        line([[-.15 * r, -r], [.1 * r, -.5 * r], [-.14 * r, .1 * r], [.1 * r, .65 * r], [-.1 * r, r]], "#f5c585", 2);
      }
      c.restore();
    }
    function rock(x, y, size, angle, color = "#c6bb9f") {
      c.save(); c.translate(x, y); c.rotate(angle);
      c.fillStyle = color; c.beginPath();
      c.moveTo(-size, -.6 * size); c.lineTo(.15 * size, -size);
      c.lineTo(size, -.25 * size); c.lineTo(.7 * size, .75 * size);
      c.lineTo(-.55 * size, size); c.closePath(); c.fill();
      c.restore();
    }
    function orbit(x, y, rx, ry, rotation) {
      c.save(); c.translate(x, y); c.rotate(rotation);
      c.strokeStyle = "#adc6d52b"; c.lineWidth = 1; c.setLineDash([4, 8]);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, tau); c.stroke(); c.restore();
    }
    function ringPosition(angle, lane = .5) {
      const rx = 205 + lane * 92, ry = 68 + lane * 38;
      const x = Math.cos(angle) * rx, y = Math.sin(angle) * ry;
      return [492 + x * Math.cos(-.27) - y * Math.sin(-.27), 285 + x * Math.sin(-.27) + y * Math.cos(-.27)];
    }
    window.drawFilm = (scene, time) => {
      const t = time / 12;
      const sky = c.createLinearGradient(0, 0, 960, 540);
      sky.addColorStop(0, "#10202e"); sky.addColorStop(1, "#03070e");
      c.fillStyle = sky; c.fillRect(0, 0, 960, 540);
      for (const [x, y, alpha] of stars) {
        c.fillStyle = `rgba(200,223,242,${.15 + alpha * .55})`;
        c.fillRect(x, y, alpha > .88 ? 2 : 1, alpha > .88 ? 2 : 1);
      }
      text("J I N X E D  /  OBSERVATION ARCHIVE", 38, 34, 12, "#f2ce8f");
      text(scene.title, 38, 66, 26, "#f0f2f5");
      text(scene.date, 38, 92, 13);
      if (scene.name === "approach") {
        globe(275, 284, 113, time);
        const x = 785 - 330 * (1 - Math.exp(-2.5 * t)) / (1 - Math.exp(-2.5));
        line([[404, 284], [811, 284]], "#e8d3a333");
        for (let i = 0; i <= 8; i++) {
          const px = 785 - 330 * (1 - Math.exp(-2.5 * i / 8)) / (1 - Math.exp(-2.5));
          line([[px, 357], [px, 367]], "#dac39988");
        }
        moon(x, 284, 43);
        text("EARTH", 244, 421, 12);
        text("MOON", x - 20, 218, 12, "#e4d9bf");
        text("Equal time intervals", 565, 395, 13);
        text("Smaller inward distances", 565, 416, 13, "#f2ce8f");
        text("INWARD SPEED  /  RELATIVE", 621, 126, 12);
        c.fillStyle = "#d5c19c33"; c.fillRect(621, 141, 210, 7);
        c.fillStyle = "#f2ce8f"; c.fillRect(621, 141, 210 * Math.exp(-2.5 * t), 7);
        text("CAUSE UNRESOLVED", 621, 174, 12, "#e4d9bf");
      } else if (scene.name === "breakup") {
        orbit(355, 293, 234, 138, -.14);
        globe(355, 293, 104, time);
        if (time < 3.5) {
          moon(655 - time * 12, 263, 47, 1 + time * .045, ease((time - .9) / 2));
          text("TIDAL DEFORMATION / FRACTURES", 525, 172, 12, "#f2ce8f");
        } else {
          const q = time - 3.5;
          for (let i = 0; i < 18; i++) {
            const a = i * 2.4;
            const startX = 613 + Math.cos(a) * (12 + i % 4 * 7);
            const startY = 263 + Math.sin(a) * (14 + i % 5 * 6);
            if (i < 7) {
              const p = ease(q / (2.9 + i * .18));
              const hitAngle = -.75 + i * .2;
              const endX = 355 + Math.cos(hitAngle) * 104;
              const endY = 293 + Math.sin(hitAngle) * 104;
              const x = startX + (endX - startX) * p;
              const y = startY + (endY - startY) * p - Math.sin(p * Math.PI) * 32;
              if (p < 1) {
                line([[x + 22, y - 5], [x, y]], "#f5bd6777", 2);
                rock(x, y, 6 + i % 3 * 3, q + a);
              } else {
                const age = q - (2.9 + i * .18);
                const strength = Math.max(0, 1 - age / 2.1);
                const glow = c.createRadialGradient(endX, endY, 0, endX, endY, 8 + age * 16);
                glow.addColorStop(0, `rgba(255,220,146,${strength})`);
                glow.addColorStop(1, "rgba(244,131,52,0)");
                c.fillStyle = glow; c.beginPath(); c.arc(endX, endY, 8 + age * 16, 0, tau); c.fill();
              }
            } else {
              const a2 = -.15 - q * (.42 + i % 3 * .025) + (i - 7) * .045;
              const rx = 234 + (i % 4 - 1.5) * 11, ry = 138 + (i % 4 - 1.5) * 8;
              const targetX = 355 + Math.cos(a2) * rx;
              const targetY = 293 + Math.sin(a2) * ry;
              const join = ease(q / 1.3);
              rock(startX + (targetX - startX) * join, startY + (targetY - startY) * join, 3 + i % 4 * 2, a + q);
            }
          }
          text(q < 4 ? "IMPACTING TRAJECTORIES" : "BOUND ORBITING FRAGMENTS", 562, 165, 13, "#f2ce8f");
        }
        text("EARTH REMAINS WHOLE", 277, 432, 12);
      } else {
        for (const lane of [0, .5, 1]) orbit(492, 285, 205 + lane * 92, 68 + lane * 38, -.27);
        const count = Math.floor(24 + 216 * ease(t * 1.6));
        const drawDebris = (front) => {
          for (let i = 0; i < count; i++) {
            const d = debris[i];
            const angle = d.angle + time * d.speed * .48;
            if ((Math.sin(angle) > 0) !== front) continue;
            const [x, y] = ringPosition(angle, d.lane);
            rock(x, y, d.size * (i < 24 ? 1.6 : .6), angle, i % 5 === 0 ? "#efce98" : "#acaeaa");
          }
        };
        drawDebris(false);
        globe(492, 285, 111, time);
        drawDebris(true);
        if (time > 5 && time < 8) {
          const age = (time - 5) % 1.5;
          const [x, y] = ringPosition(1.0 + time * .45, .65);
          c.strokeStyle = `rgba(243,222,171,${1 - age / 1.5})`;
          c.beginPath(); c.arc(x, y, 3 + age * 10, 0, tau); c.stroke();
        }
        if (time > 9) {
          const p = ease((time - 9) / 1.6);
          const [sx, sy] = ringPosition(.8, .5);
          const x = sx + (544 - sx) * p, y = sy + (370 - sy) * p;
          if (p < 1) line([[x + 15, y - 15], [x, y]], "#f3d397", 2);
        }
        text("COLLISIONS + SPREADING", 38, 166, 12, "#f2ce8f");
        text("UNEVEN LANES", 738, 408, 12, "#f2ce8f");
        text("Not a stable, finished ornament.", 38, 432, 13);
      }
      c.fillStyle = "#050a12ed"; c.fillRect(0, 465, 960, 75);
      const cue = scene.cues.find(([start, end]) => time >= start && time < end) ?? scene.cues.at(-1);
      text(cue[2], 38, 497, 19, "#f2eee5");
      text("ORIGINAL STORY FILM  /  SILENT  /  ILLUSTRATIVE, NOT TO SCALE", 38, 523, 10, "#9db0c3");
      c.fillStyle = "#d7bc82"; c.fillRect(0, 538, 960 * t, 2);
    };
  });
  for (const scene of scenes) {
    const result = await page.evaluate(async ({ scene, duration, fps }) => {
      const canvas = document.querySelector("canvas");
      window.drawFilm(scene, scene.name === "ring" ? 8 : scene.name === "breakup" ? 5.5 : 1);
      const poster = canvas.toDataURL("image/png").split(",")[1];
      const config = { codec: "vp09.00.10.08", width: 960, height: 540, bitrate: 1500000, framerate: fps };
      if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error("Chromium must support VP9 encoding.");
      const frames = [];
      let error;
      const encoder = new VideoEncoder({
        error: (failure) => { error = failure; },
        output: (chunk) => {
          const bytes = new Uint8Array(chunk.byteLength);
          chunk.copyTo(bytes);
          let encoded = "";
          for (let i = 0; i < bytes.length; i += 8192) encoded += String.fromCharCode(...bytes.subarray(i, i + 8192));
          frames.push({ timestamp: chunk.timestamp, key: chunk.type === "key", data: btoa(encoded) });
        },
      });
      encoder.configure(config);
      for (let frame = 0; frame < duration * fps; frame++) {
        window.drawFilm(scene, frame / fps);
        const image = new VideoFrame(canvas, { timestamp: Math.round(frame * 1e6 / fps), duration: Math.round(1e6 / fps) });
        encoder.encode(image, { keyFrame: frame % (fps * 2) === 0 });
        image.close();
        if (frame % fps === fps - 1) await encoder.flush();
        if (error) throw error;
      }
      await encoder.flush();
      encoder.close();
      if (frames.length !== duration * fps) throw new Error("Video encoder dropped frames.");
      return { poster, frames };
    }, { scene, duration, fps });
    await writeFile(new URL(`${scene.name}.webm`, output), webm(result.frames));
    await writeFile(new URL(`${scene.name}.png`, output), Buffer.from(result.poster, "base64"));
    const timestamp = (seconds) => `00:00:${String(seconds).padStart(2, "0")}.000`;
    const captions = "WEBVTT\n\n" + scene.cues.map(([start, end, text]) =>
      `${timestamp(start)} --> ${timestamp(end)}\n${text}\n`).join("\n");
    await writeFile(new URL(`${scene.name}.vtt`, output), captions);
    console.log(`Built ${scene.name}.webm, poster and captions (12 seconds, 960 × 540, VP9).`);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
}
