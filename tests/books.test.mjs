import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { unzipSync, strFromU8 } from "fflate";
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from "pdf-lib";
import { chromium } from "playwright";
import {
  root, languages, bookDate, englishEdition, loadEdition, validateEdition, escapeXml, buildEpub, buildPdf,
} from "../tools/build-books.mjs";

const canonical = await englishEdition();
const cover = await readFile(join(root, "assets", "jinx-book-cover.png"));
const bookPath = (language, extension) => join(root, "assets", "books", `jinx-${language}.${extension}`);

async function localFontResources() {
  const css = await readFile(join(root, "assets", "book-fonts.css"), "utf8");
  const fonts = await Promise.all([...css.matchAll(/@font-face \{([\s\S]*?)\}/g)].map(async ([, block]) => {
    const filename = block.match(/fonts\/([^"]+)/)[1];
    return {
      filename,
      family: block.match(/font-family: '([^']+)'/)[1],
      unicodeRange: block.match(/unicode-range: ([^;]+)/)[1],
      bytes: await readFile(join(root, "assets", "fonts", filename)),
      language: filename.startsWith("noto-sans-telugu") ? "te" : filename.startsWith("noto-sans-devanagari") ? "hi" : "all",
    };
  }));
  return { fonts, licenses: [] };
}

test("generator rejects invalid, partial, reordered, and English-fallback translations", () => {
  assert.equal(validateEdition(canonical, "en", canonical), canonical);
  const copy = () => structuredClone(canonical);
  let bad = copy();
  assert.throws(() => validateEdition(bad, "te", canonical), /metadata/);
  bad.language = "es";
  assert.throws(() => validateEdition(bad, "es", canonical), /English fallback/);
  bad = copy();
  bad.chapters.pop();
  assert.throws(() => validateEdition(bad, "en", canonical), /eight/);
  bad = copy();
  bad.chapters.reverse();
  assert.throws(() => validateEdition(bad, "en", canonical), /order/);
  bad = copy();
  bad.chapters[0].blocks.pop();
  assert.throws(() => validateEdition(bad, "en", canonical), /incomplete story/);
  bad = copy();
  bad.chapters[0].blocks[0].kind = "paragraph";
  assert.throws(() => validateEdition(bad, "en", canonical), /kinds/);
  bad = copy();
  bad.chapters[0].blocks[1].text = "";
  assert.throws(() => validateEdition(bad, "en", canonical), /nonempty/);
  bad.chapters[0].blocks[1].text = "\u0000";
  assert.throws(() => validateEdition(bad, "en", canonical), /Unicode/);
  assert.equal(escapeXml(`<span x="a">&'</span>`), "&lt;span x=&quot;a&quot;&gt;&amp;&apos;&lt;/span&gt;");
});

test("generator rejects unknown CLI arguments without generating a fallback edition", () => {
  const result = spawnSync(process.execPath, [join(root, "tools", "build-books.mjs"), "--language=fr"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
});

test("font CSS self-hosts full Telugu, Devanagari, and Latin coverage with matching licenses", async () => {
  const css = await readFile(join(root, "assets", "book-fonts.css"), "utf8");
  assert.match(css, /font-family: 'Jinx Telugu'/);
  assert.match(css, /font-family: 'Jinx Devanagari'/);
  assert.match(css, /U\+0C00-0C7F/);
  assert.match(css, /U\+0900-097F/);
  assert.match(css, /U\+200C-200D/);
  assert.match(css, /U\+0000-00FF/);
  assert.doesNotMatch(css, /https?:|node_modules/);
  const urls = [...css.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)].map((match) => match[1]);
  assert.equal(urls.length, 8);
  for (const filename of urls) {
    const font = await readFile(join(root, "assets", "fonts", filename));
    assert.equal(font.subarray(0, 4).toString(), "wOFF", filename);
    assert.ok(font.length > 1000);
  }
  for (const name of ["noto-sans-telugu", "noto-sans-devanagari", "noto-serif"]) {
    const license = await readFile(join(root, "assets", "fonts", `${name}-LICENSE.txt`), "utf8");
    assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(license, /Copyright/);
  }
});

test("generator shapes Indic samples with embedded Telugu and Devanagari fonts in real PDFs", async () => {
  const resources = await localFontResources();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [language, text, fontName] of [
      ["te", "తెలుగు — శ్రీ, క్ష, జ్ఞ, త్ర. ప్రపంచం ఒక కొత్త ప్రారంభం.", /NotoSansTelugu/],
      ["hi", "हिन्दी — क्ष, ज्ञ, त्र, श्र. दुनिया की एक नई शुरुआत।", /NotoSansDevanagari/],
    ]) {
      // Isolated typesetting fixtures are never published as story editions.
      const edition = { language, title: "JINX", subtitle: text, chapters: [
        { id: "prologue", title: text, subtitle: text, blocks: [{ kind: "paragraph", text }] },
      ] };
      const bytes = await buildPdf(edition, resources, cover, browser);
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      const descriptors = pdf.context.enumerateIndirectObjects().map(([, object]) => object)
        .filter((object) => object instanceof PDFDict && object.get(PDFName.of("Type"))?.toString() === "/FontDescriptor");
      const scriptFont = descriptors.find((font) => fontName.test(font.get(PDFName.of("FontName"))?.toString()));
      assert.ok(scriptFont, `${language}: Chromium used the intended complex-script font`);
      const embedded = scriptFont.get(PDFName.of("FontFile2")) || scriptFont.get(PDFName.of("FontFile3"));
      assert.ok(pdf.context.lookup(embedded) instanceof PDFRawStream);
      assert.equal(pdf.getPageCount(), 4, "Cover, contents, shaped-script chapter, colophon");
      assert.equal(pdf.catalog.lookup(PDFName.of("Lang")).decodeText(), language);
    }
  } finally {
    await browser.close();
  }
});

for (const language of languages) {
  test(`${language}: EPUB has a conforming ZIP container, metadata, ordered TOC/spine, cover, embedded fonts, and every source block`, async () => {
    const edition = await loadEdition(language, canonical);
    const zip = await readFile(bookPath(language, "epub"));
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    assert.equal(zip.readUInt16LE(8), 0, "First ZIP entry must be uncompressed");
    assert.equal(zip.readUInt16LE(28), 0, "mimetype must not have extra fields");
    assert.equal(zip.subarray(30, 38).toString(), "mimetype");
    assert.equal(zip.subarray(38, 58).toString(), "application/epub+zip");
    const files = unzipSync(zip);
    const text = (name) => {
      assert.ok(files[`EPUB/${name}`], `Missing EPUB/${name}`);
      return strFromU8(files[`EPUB/${name}`]);
    };
    assert.equal(strFromU8(files.mimetype), "application/epub+zip");
    assert.match(strFromU8(files["META-INF/container.xml"]), /full-path="EPUB\/package.opf"/);
    assert.deepEqual(Buffer.from(files["EPUB/cover.png"]), cover);
    const opf = text("package.opf");
    assert.match(opf, new RegExp(`<dc:language>${language}</dc:language>`));
    assert.match(opf, new RegExp(`<meta property="dcterms:modified">${bookDate}</meta>`));
    assert.match(opf, /properties="cover-image"/);
    assert.match(opf, /media-type="application\/xhtml\+xml" properties="nav"/);
    const manifest = [...opf.matchAll(/<item id="([^"]+)" href="([^"]+)" media-type="([^"]+)"[^>]*\/>/g)];
    const byId = new Map(manifest.map(([, id, href]) => [id, href]));
    assert.equal(byId.size, manifest.length, "Manifest IDs are unique");
    for (const [, , href] of manifest) assert.ok(files[`EPUB/${href}`], `Missing manifest entry: ${href}`);
    const spine = [...opf.matchAll(/<itemref idref="([^"]+)"\/>/g)].map((match) => match[1]);
    assert.deepEqual(spine, ["cover", "nav", ...canonical.chapters.map(({ id }) => `chapter-${id}`), "colophon"]);
    for (const id of spine) assert.ok(byId.has(id));
    const nav = text("nav.xhtml");
    const toc = nav.split("</nav>")[0];
    const links = [...toc.matchAll(/<a href="chapter-([^"]+)\.xhtml#/g)].map((match) => match[1]);
    assert.deepEqual(links, canonical.chapters.map(({ id }) => id));
    assert.equal((text("toc.ncx").match(/<navPoint /g) || []).length, 8);
    assert.match(text("cover.xhtml"), /<img src="cover.png"/);
    const css = text("book.css");
    const fonts = manifest.filter((entry) => entry[3] === "font/woff");
    assert.ok(fonts.length >= 2, "EPUB must include its own fonts");
    for (const [, , href] of fonts) {
      assert.equal(Buffer.from(files[`EPUB/${href}`]).subarray(0, 4).toString(), "wOFF");
      assert.ok(css.includes(href), `Font is used by CSS: ${href}`);
    }
    for (const [, , href] of manifest.filter((entry) => entry[3] === "text/plain")) {
      assert.match(text(href), /SIL OPEN FONT LICENSE/);
    }
    if (language === "te") assert.match(css, /Jinx Telugu/);
    if (language === "hi") assert.match(css, /Jinx Devanagari/);
    for (const chapter of edition.chapters) {
      const html = text(`chapter-${chapter.id}.xhtml`);
      assert.match(html, new RegExp(`xml:lang="${language}"`));
      assert.ok(html.includes(`<h1>${escapeXml(chapter.title)}</h1>`));
      const blocks = [...html.matchAll(/<p class="block (context|paragraph|break)">([\s\S]*?)<\/p>/g)];
      assert.equal(blocks.length, chapter.blocks.length);
      chapter.blocks.forEach((block, index) => {
        assert.equal(blocks[index][1], block.kind);
        assert.equal(blocks[index][2], escapeXml(block.text), `${chapter.id} block ${index} is preserved in full`);
      });
    }
    if (language !== "en") assert.match(text("colophon.xhtml"), /AI-assisted translation — pending editorial review/);
    assert.doesNotMatch(Object.keys(files).join("\n"), /\.\.|\\/);
  });

  test(`${language}: PDF has real book pages, language metadata, cover image, embedded fonts, and chapter bookmarks`, async () => {
    const bytes = await readFile(bookPath(language, "pdf"));
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.ok(pdf.getPageCount() >= 25, "A full-length story must not be a one-page download placeholder");
    assert.equal(pdf.getTitle(), "JINX");
    assert.equal(pdf.getAuthor(), "Rajesh Kodaganti");
    assert.equal(pdf.getCreationDate().toISOString(), new Date(bookDate).toISOString());
    assert.equal(pdf.getModificationDate().toISOString(), new Date(bookDate).toISOString());
    assert.equal(pdf.catalog.lookup(PDFName.of("Lang")).decodeText(), language);
    for (const page of pdf.getPages()) assert.deepEqual(page.getSize(), { width: 432, height: 648 });
    const images = pdf.getPages()[0].node.Resources().lookup(PDFName.of("XObject"), PDFDict);
    assert.ok(images.values().some((ref) => {
      const object = pdf.context.lookup(ref);
      return object instanceof PDFRawStream &&
        object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image" &&
        object.dict.get(PDFName.of("Width"))?.asNumber() === cover.readUInt32BE(16) &&
        object.dict.get(PDFName.of("Height"))?.asNumber() === cover.readUInt32BE(20);
    }), "First page includes the original portrait cover image");
    const descriptors = pdf.context.enumerateIndirectObjects().map(([, object]) => object)
      .filter((object) => object instanceof PDFDict && object.get(PDFName.of("Type"))?.toString() === "/FontDescriptor");
    assert.ok(descriptors.length > 0);
    for (const font of descriptors) {
      const file = font.get(PDFName.of("FontFile2")) || font.get(PDFName.of("FontFile3")) || font.get(PDFName.of("FontFile"));
      assert.ok(file, `${font.get(PDFName.of("FontName"))} must be embedded`);
      assert.ok(pdf.context.lookup(file) instanceof PDFRawStream);
    }
    const fontNames = descriptors.map((font) => font.get(PDFName.of("FontName"))?.toString()).join(" ");
    const expectedFont = language === "te" ? /NotoSansTelugu/ : language === "hi" ? /NotoSansDevanagari/ : /NotoSerif/;
    assert.match(fontNames, expectedFont, `${language}: the edition's primary font is embedded`);
    const outlines = pdf.catalog.lookup(PDFName.of("Outlines"), PDFDict);
    assert.ok(outlines, "PDF provides navigable chapter bookmarks");
    assert.ok(outlines.get(PDFName.of("Count")).asNumber() >= 8);
    if (language !== "en") assert.match(pdf.getSubject(), /AI-assisted translation; pending editorial review/);
  });
}

test("generator EPUB packaging is byte-reproducible and derived from current source", async () => {
  const zip = unzipSync(await readFile(bookPath("en", "epub")));
  const css = strFromU8(zip["EPUB/book.css"]);
  const fonts = [...css.matchAll(/@font-face \{([\s\S]*?)\}/g)].map(([, block]) => {
    const filename = block.match(/fonts\/([^"]+)/)[1];
    return {
      family: block.match(/font-family: '([^']+)'/)[1],
      filename,
      unicodeRange: block.match(/unicode-range: ([^;]+)/)[1],
      bytes: Buffer.from(zip[`EPUB/fonts/${filename}`]),
      language: "all",
    };
  });
  const licenses = Object.keys(zip).filter((name) => name.endsWith("-LICENSE.txt")).map((name) => ({
    filename: name.split("/").at(-1), bytes: zip[name], language: "all",
  }));
  const resources = { fonts, licenses };
  const first = buildEpub(canonical, resources, cover);
  const second = buildEpub(canonical, resources, cover);
  assert.deepEqual(first, second);
  assert.deepEqual(Buffer.from(first), await readFile(bookPath("en", "epub")), "Committed EPUB is up to date");
});
