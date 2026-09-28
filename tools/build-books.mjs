import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { zipSync, strToU8 } from "fflate";
import { PDFDocument, PDFHexString, PDFName, PDFString } from "pdf-lib";
import { chapters, parseChapter } from "../assets/content.js";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const languages = ["en", "te", "hi", "es"];
export const bookDate = "2000-01-01T00:00:00Z";
const output = join(root, "assets", "books");
const fontDirectory = join(root, "assets", "fonts");
const fontSpecs = [
  { package: "noto-sans-telugu", family: "Jinx Telugu", subsets: ["telugu", "latin-ext", "latin"], language: "te" },
  { package: "noto-sans-devanagari", family: "Jinx Devanagari", subsets: ["devanagari", "latin-ext", "latin"], language: "hi" },
  { package: "noto-serif", family: "Jinx Serif", subsets: ["latin-ext", "latin"], language: "all" },
];
const labels = {
  en: { contents: "Contents", colophon: "About this edition" },
  te: { contents: "విషయ సూచిక", colophon: "ఈ సంచిక గురించి" },
  hi: { contents: "विषय सूची", colophon: "इस संस्करण के बारे में" },
  es: { contents: "Índice", colophon: "Acerca de esta edición" },
};

export function escapeXml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character]);
}

function requireText(value, location) {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/u.test(value)) {
    throw new Error(`${location}: expected nonempty, valid Unicode text`);
  }
}

export async function englishEdition() {
  return {
    language: "en",
    title: "JINX",
    subtitle: "A Rajesh Kodaganti's Migration",
    chapters: await Promise.all(chapters.map(async (chapter) => ({
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      blocks: parseChapter(await readFile(join(root, ...chapter.path.split("/")), "utf8"), chapter).blocks,
    }))),
  };
}

export function validateEdition(edition, language, canonical) {
  if (!languages.includes(language) || edition?.language !== language || edition?.title !== "JINX") {
    throw new Error(`Invalid ${language} edition: language metadata/title mismatch`);
  }
  requireText(edition.subtitle, `${language}.subtitle`);
  if (!Array.isArray(edition.chapters) || edition.chapters.length !== canonical.chapters.length) {
    throw new Error(`${language}: expected all eight full chapters`);
  }
  edition.chapters.forEach((chapter, index) => {
    const original = canonical.chapters[index];
    if (chapter.id !== original.id) throw new Error(`${language}: chapter IDs/order must match the canonical story`);
    requireText(chapter.title, `${language}.${chapter.id}.title`);
    requireText(chapter.subtitle, `${language}.${chapter.id}.subtitle`);
    if (!Array.isArray(chapter.blocks) || chapter.blocks.length !== original.blocks.length) {
      throw new Error(`${language}.${chapter.id}: incomplete story; expected ${original.blocks.length} source blocks`);
    }
    chapter.blocks.forEach((block, blockIndex) => {
      requireText(block.text, `${language}.${chapter.id}.blocks[${blockIndex}]`);
      if (block.kind !== original.blocks[blockIndex].kind) {
        throw new Error(`${language}.${chapter.id}: source block kinds/order must be preserved`);
      }
    });
    if (language !== "en" && chapter.blocks.every((block, i) => block.text === original.blocks[i].text)) {
      throw new Error(`${language}.${chapter.id}: English fallback is not a translation`);
    }
    const story = chapter.blocks.map(({ text }) => text).join("\n");
    if (language === "te" && !/[\u0C00-\u0C7F]/u.test(story)) throw new Error(`${chapter.id}: missing Telugu text`);
    if (language === "hi" && !/[\u0900-\u097F]/u.test(story)) throw new Error(`${chapter.id}: missing Hindi text`);
  });
  return edition;
}

export async function loadEdition(language, canonical) {
  canonical ??= await englishEdition();
  if (language === "en") return validateEdition(canonical, language, canonical);
  if (!languages.includes(language)) throw new Error(`Unsupported language: ${language}`);
  let edition;
  try {
    edition = JSON.parse(await readFile(join(output, `${language}.json`), "utf8"));
  } catch (error) {
    throw new Error(`Cannot build ${language}: assets/books/${language}.json is missing or invalid. No English fallback.`, { cause: error });
  }
  return validateEdition(edition, language, canonical);
}

export async function prepareFonts() {
  await mkdir(fontDirectory, { recursive: true });
  const fonts = [];
  const licenses = [];
  for (const spec of fontSpecs) {
    const source = join(root, "node_modules", "@fontsource", spec.package);
    const sourceCss = await readFile(join(source, "400.css"), "utf8");
    for (const subset of spec.subsets) {
      const filename = `${spec.package}-${subset}-400-normal.woff`;
      const declaration = sourceCss.split("/*").find((part) => part.trimStart().startsWith(`${spec.package}-${subset}-400-normal */`));
      const unicodeRange = declaration?.match(/unicode-range:\s*([^;]+);/)?.[1];
      if (!unicodeRange) throw new Error(`Missing verified font coverage for ${filename}`);
      const bytes = await readFile(join(source, "files", filename));
      await writeFile(join(fontDirectory, filename), bytes);
      fonts.push({ ...spec, filename, bytes, unicodeRange });
    }
    const filename = `${spec.package}-LICENSE.txt`;
    const bytes = await readFile(join(source, "LICENSE"));
    await writeFile(join(fontDirectory, filename), bytes);
    licenses.push({ filename, bytes, language: spec.language });
  }
  await writeFile(join(root, "assets", "book-fonts.css"),
    "/* Generated by npm run build:books from pinned Fontsource packages; see assets/fonts/*-LICENSE.txt. */\n" +
    fontCss(fonts, (font) => `./fonts/${font.filename}`));
  return { fonts, licenses };
}

function fontCss(fonts, location) {
  return fonts.map((font) => `@font-face {
  font-family: '${font.family}';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("${location(font)}") format("woff");
  unicode-range: ${font.unicodeRange};
}`).join("\n\n") + "\n";
}

function editionFonts(resources, language) {
  return {
    fonts: resources.fonts.filter((font) => font.language === "all" || font.language === language),
    licenses: resources.licenses.filter((license) => license.language === "all" || license.language === language),
  };
}

function bodyCss(language) {
  const family = language === "te" ? "'Jinx Telugu', " : language === "hi" ? "'Jinx Devanagari', " : "";
  return `
body { font-family: ${family}'Jinx Serif', serif; font-size: 11pt; line-height: 1.65; color: #17171a; margin: 0; }
h1, h2 { font-weight: 400; line-height: 1.45; break-after: avoid; }
h1 { font-size: 24pt; margin: 0 0 0.4em; }
.subtitle { margin: 0 0 2em; font-size: 12pt; }
.block { white-space: pre-wrap; overflow-wrap: break-word; orphans: 3; widows: 3; margin: 0 0 0.9em; }
.context { color: #45454b; margin-bottom: 1.5em; }
.break { text-align: center; margin: 1.5em 0; }
a { color: inherit; text-decoration: none; }
li { margin-bottom: 0.9em; }
.cover { text-align: center; padding: 0; margin: 0; }
.cover img { display: block; width: 100%; height: auto; max-height: 100%; object-fit: contain; margin: auto; }
.colophon p { margin-bottom: 1em; }
`;
}

function chapterHtml(chapter) {
  return `<section class="chapter" id="${chapter.id}"><h1>${escapeXml(chapter.title)}</h1>` +
    `<p class="subtitle">${escapeXml(chapter.subtitle)}</p>` +
    chapter.blocks.map(({ kind, text }) => `<p class="block ${kind}">${escapeXml(text)}</p>`).join("\n") +
    "</section>";
}

function contentsHtml(edition, epub = false) {
  return `<nav${epub ? ' epub:type="toc" id="toc"' : ' id="contents"'}><h1>${labels[edition.language].contents}</h1><ol>` +
    edition.chapters.map((chapter) => `<li><a href="${epub ? `chapter-${chapter.id}.xhtml` : ""}#${chapter.id}">${escapeXml(chapter.title)}</a></li>`).join("\n") +
    "</ol></nav>";
}

function colophonHtml(edition) {
  return `<section class="colophon"><h1>${labels[edition.language].colophon}</h1>
<p lang="en" xml:lang="en">JINX — a story by Rajesh Kodaganti. This edition contains all eight chapters, from Prologue to Epilogue.</p>
${edition.language === "en" ? '<p lang="en" xml:lang="en">English source edition. Story paragraphs are preserved from the original chapter files.</p>' :
    '<p lang="en" xml:lang="en">AI-assisted translation — pending editorial review. Please consult the English source edition for authoritative wording.</p>'}
<p lang="en" xml:lang="en">Typeset with locally embedded Noto fonts. Copyright the Noto Project Authors. Licensed under the SIL Open Font License 1.1.</p></section>`;
}

function xhtml(edition, title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${edition.language}" xml:lang="${edition.language}">
<head><meta charset="UTF-8"/><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="book.css"/></head>
<body>${body}</body></html>`;
}

function identifier(edition) {
  return `urn:sha256:${createHash("sha256").update(JSON.stringify(edition)).digest("hex")}`;
}

export function buildEpub(edition, resources, cover) {
  const { fonts, licenses } = editionFonts(resources, edition.language);
  // Fixed local calendar fields produce the same DOS ZIP timestamp in every timezone.
  const options = { mtime: new Date(2000, 0, 1, 0, 0, 0), level: 9 };
  const entries = {};
  const add = (name, contents, level = 9) => {
    entries[name] = [typeof contents === "string" ? strToU8(contents) : new Uint8Array(contents), { ...options, level }];
  };
  add("mimetype", "application/epub+zip", 0);
  add("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>
<rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
</rootfiles></container>`);
  add("EPUB/cover.png", cover, 0);
  add("EPUB/cover.xhtml", xhtml(edition, "JINX — Cover",
    '<section class="cover" epub:type="cover"><img src="cover.png" alt="JINX — A Rajesh Kodaganti’s Migration" width="1600" height="2400"/></section>'));
  add("EPUB/nav.xhtml", xhtml(edition, labels[edition.language].contents, contentsHtml(edition, true) +
    `<nav epub:type="landmarks" hidden="hidden"><h2>Landmarks</h2><ol><li><a epub:type="cover" href="cover.xhtml">Cover</a></li><li><a epub:type="bodymatter" href="chapter-prologue.xhtml#prologue">${escapeXml(edition.chapters[0].title)}</a></li></ol></nav>`));
  add("EPUB/colophon.xhtml", xhtml(edition, labels[edition.language].colophon, colophonHtml(edition)));
  add("EPUB/book.css", fontCss(fonts, (font) => `fonts/${font.filename}`) + bodyCss(edition.language));
  for (const chapter of edition.chapters) add(`EPUB/chapter-${chapter.id}.xhtml`, xhtml(edition, chapter.title, chapterHtml(chapter)));
  for (const font of fonts) add(`EPUB/fonts/${font.filename}`, font.bytes);
  for (const license of licenses) add(`EPUB/fonts/${license.filename}`, license.bytes);
  add("EPUB/toc.ncx", `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${edition.language}">
<head><meta name="dtb:uid" content="${identifier(edition)}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>
<docTitle><text>JINX</text></docTitle><navMap>${edition.chapters.map((chapter, index) =>
    `<navPoint id="nav-${chapter.id}" playOrder="${index + 1}"><navLabel><text>${escapeXml(chapter.title)}</text></navLabel><content src="chapter-${chapter.id}.xhtml#${chapter.id}"/></navPoint>`).join("")}</navMap></ncx>`);
  add("EPUB/package.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${edition.language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">${identifier(edition)}</dc:identifier><dc:title>JINX</dc:title>
<dc:creator>Rajesh Kodaganti</dc:creator><dc:language>${edition.language}</dc:language>
<dc:description>${escapeXml(edition.subtitle)}${edition.language !== "en" ? " — AI-assisted translation; pending editorial review." : ""}</dc:description>
<meta property="dcterms:modified">${bookDate}</meta><meta name="cover" content="cover-image"/>
</metadata><manifest>
<item id="cover-image" href="cover.png" media-type="image/png" properties="cover-image"/>
<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="css" href="book.css" media-type="text/css"/>
<item id="colophon" href="colophon.xhtml" media-type="application/xhtml+xml"/>
${edition.chapters.map((chapter) => `<item id="chapter-${chapter.id}" href="chapter-${chapter.id}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
${fonts.map((font, index) => `<item id="font-${index}" href="fonts/${font.filename}" media-type="font/woff"/>`).join("\n")}
${licenses.map((license, index) => `<item id="license-${index}" href="fonts/${license.filename}" media-type="text/plain"/>`).join("\n")}
</manifest><spine toc="ncx"><itemref idref="cover"/><itemref idref="nav"/>
${edition.chapters.map((chapter) => `<itemref idref="chapter-${chapter.id}"/>`).join("\n")}
<itemref idref="colophon"/></spine>
<guide><reference type="cover" title="Cover" href="cover.xhtml"/><reference type="toc" title="Contents" href="nav.xhtml"/></guide>
</package>`);
  return zipSync(entries);
}

export async function buildPdf(edition, resources, cover, browser) {
  const { fonts } = editionFonts(resources, edition.language);
  const css = fontCss(fonts, (font) => `data:font/woff;base64,${font.bytes.toString("base64")}`) +
    bodyCss(edition.language) + `
@page { size: 6in 9in; margin: 0.6in; }
@page cover { size: 6in 9in; margin: 0; }
.cover { page: cover; width: 6in; height: 9in; break-after: page; }
.cover img { width: 6in; height: 9in; }
.chapter, .colophon { break-before: page; }
`;
  const html = `<!doctype html><html lang="${edition.language}"><head><meta charset="UTF-8"><title>JINX</title><style>${css}</style></head><body>` +
    `<section class="cover"><img alt="JINX cover" src="data:image/png;base64,${cover.toString("base64")}"></section>` +
    contentsHtml(edition) + edition.chapters.map(chapterHtml).join("\n") + colophonHtml(edition) + "</body></html>";
  const page = await browser.newPage({ locale: edition.language, timezoneId: "UTC" });
  try {
    await page.route("**/*", (route) => route.abort());
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      if ([...document.fonts].some((font) => font.status === "error")) throw new Error("A book font failed to load");
    });
    const raw = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    const document = await PDFDocument.load(raw, { updateMetadata: false });
    document.setTitle("JINX");
    document.setAuthor("Rajesh Kodaganti");
    document.setSubject(`${edition.subtitle}${edition.language !== "en" ? " — AI-assisted translation; pending editorial review." : ""}`);
    document.setCreator("JINX static book generator");
    document.setProducer("JINX / pinned Playwright Chromium + pdf-lib");
    document.setCreationDate(new Date(bookDate));
    document.setModificationDate(new Date(bookDate));
    document.catalog.set(PDFName.of("Lang"), PDFString.of(edition.language));
    // Chromium emits wall-clock dates; replace them and any trailer ID before serialization.
    const id = PDFHexString.of(createHash("sha256").update(JSON.stringify(edition)).digest("hex").slice(0, 32));
    document.context.trailerInfo.ID = document.context.obj([id, id]);
    return await document.save({ useObjectStreams: true, addDefaultPage: false });
  } finally {
    await page.close();
  }
}

export async function buildBooks(selected = languages) {
  const canonical = await englishEdition();
  // Validate every requested edition before writing outputs (never substitute another language).
  const editions = await Promise.all(selected.map((language) => loadEdition(language, canonical)));
  const resources = await prepareFonts();
  const cover = await readFile(join(root, "assets", "jinx-book-cover.png"));
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const edition of editions) {
      const epub = buildEpub(edition, resources, cover);
      const pdf = await buildPdf(edition, resources, cover, browser);
      for (const [extension, bytes] of [["epub", epub], ["pdf", pdf]]) {
        const destination = join(output, `jinx-${edition.language}.${extension}`);
        await writeFile(`${destination}.building`, bytes);
        await rename(`${destination}.building`, destination);
      }
      console.log(`${edition.language}: ${edition.chapters.length} chapters; EPUB ${epub.length} bytes; PDF ${pdf.length} bytes`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !/^--language=(en|te|hi|es)$/.test(args[0]))) {
    console.error("Usage: npm run build:books -- [--language=en|te|hi|es]");
    process.exitCode = 1;
  } else {
    try {
      await buildBooks(args.length ? [args[0].split("=")[1]] : languages);
    } catch (error) {
      console.error(`Book generation failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
