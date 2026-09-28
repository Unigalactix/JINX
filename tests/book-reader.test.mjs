import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chapters, parseChapter } from "../assets/content.js";
import { bookLanguages, validateEdition, pageForAnchor } from "../assets/book-reader.js";

const root = new URL("../", import.meta.url);
const english = {
  language: "en", title: "JINX", subtitle: "A Rajesh Kodaganti's Migration",
  chapters: await Promise.all(chapters.map(async (chapter) => ({
    ...chapter, blocks: parseChapter(await readFile(new URL(chapter.path, root), "utf8"), chapter).blocks,
  }))),
};
const sharedSpanishLabels = {
  hallelujah: [{ index: 141, text: "Zan." }],
  ego: [
    { index: 0, text: "California\n2170-2171" },
    { index: 22, text: "Egon.\nAbel.\nMara.\nKit.\nJonah.\nInez.\nTomas.\nAda.\nLewis.\nJune.\nSol.\nNell." },
    { index: 71, text: "JINX." },
  ],
  voyage: [{ index: 0, text: "California\n2172-2177" }],
  epilogue: [{ index: 92, text: "Rak Reyes-Ortiz." }, { index: 93, text: "Theo Vale-Mercer." }],
};

test("book reader validates the real English and all translated editions", async () => {
  assert.equal(validateEdition(english, "en"), english);
  for (const language of ["te", "hi", "es"]) {
    const edition = JSON.parse(await readFile(new URL(`assets/books/${language}.json`, root), "utf8"));
    assert.equal(validateEdition(edition, language, english), edition);
    for (const [index, chapter] of edition.chapters.entries()) {
      assert.equal(chapter.blocks.length, english.chapters[index].blocks.length);
      const unchanged = chapter.blocks.flatMap((block, blockIndex) =>
        block.kind !== "break" && block.text === english.chapters[index].blocks[blockIndex].text ?
          [{ index: blockIndex, text: block.text }] : []);
      assert.deepEqual(unchanged, language === "es" ? sharedSpanishLabels[chapter.id] ?? [] : [],
        `${language}/${chapter.id}: only verified shared proper names and place/date labels may match English`);
      if (language === "te") assert.match(chapter.blocks.map((block) => block.text).join(" "), /\p{Script=Telugu}/u);
      if (language === "hi") assert.match(chapter.blocks.map((block) => block.text).join(" "), /\p{Script=Devanagari}/u);
    }
  }
  assert.deepEqual(Object.keys(bookLanguages), ["en", "te", "hi", "es"]);
});

test("book reader rejects missing, wrong-language, and incomplete translations", () => {
  assert.throws(() => validateEdition(null, "en"), /Invalid/);
  assert.throws(() => validateEdition(english, "te"), /Invalid/);
  const invalid = structuredClone(english);
  invalid.chapters[0].blocks.pop();
  assert.throws(() => validateEdition(invalid, "en", english), /Incomplete/);
  invalid.chapters[0].blocks = structuredClone(english.chapters[0].blocks);
  invalid.chapters[0].blocks[1].text = "";
  assert.throws(() => validateEdition(invalid, "en", english), /Invalid paragraph/);
});

test("pagination anchors preserve a paragraph and its continuation after reflow", () => {
  const pages = [
    { segments: [{ block: 0, offset: 0 }] },
    { segments: [{ block: 3, offset: 0 }] },
    { segments: [{ block: 3, offset: 84 }] },
    { segments: [{ block: 6, offset: 0 }] },
  ];
  assert.equal(pageForAnchor(pages, { block: 0, offset: 0 }), 0);
  assert.equal(pageForAnchor(pages, { block: 3, offset: 83 }), 1);
  assert.equal(pageForAnchor(pages, { block: 3, offset: 84 }), 2);
  assert.equal(pageForAnchor(pages, { block: 4, offset: 0 }), 2);
  assert.equal(pageForAnchor(pages, { block: 7, offset: 0 }), 3);
});
