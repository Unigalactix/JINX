export const teluguDialects = {
  standard: "ప్రామాణిక తెలుగు",
  telangana: "తెలంగాణ",
  rayalaseema: "రాయలసీమ",
};

// Regional editions keep the literary narration and adapt selected spoken passages.
export function applyTeluguDialect(edition, adaptations, dialect) {
  if (!Object.hasOwn(teluguDialects, dialect)) throw new Error(`Unsupported Telugu dialect: ${dialect}`);
  if (edition?.language !== "te") throw new Error("Telugu dialects require a Telugu edition.");
  if (dialect === "standard") return edition;
  if (adaptations?.title !== edition.title || !Array.isArray(adaptations.chapters) ||
      adaptations.chapters.length !== edition.chapters.length) {
    throw new Error("Invalid Telugu dialect adaptations.");
  }
  const variant = dialect === "telangana" ? 1 : 2;
  const chapters = edition.chapters.map((chapter, index) => {
    const adapted = adaptations.chapters[index];
    if (adapted?.id !== chapter.id || adapted.blockCount !== chapter.blocks.length ||
        !Array.isArray(adapted.passages) || !adapted.passages.length) {
      throw new Error(`Incomplete Telugu dialect adaptations: ${chapter.id}`);
    }
    const blocks = chapter.blocks.map((block) => ({ ...block }));
    let previous = -1;
    for (const passage of adapted.passages) {
      const [blockIndex] = Array.isArray(passage) ? passage : [];
      if (passage?.length !== 3 || !Number.isInteger(blockIndex) || blockIndex <= previous ||
          blocks[blockIndex]?.kind !== "paragraph" ||
          passage.slice(1).some((text) => typeof text !== "string" || !text.trim() ||
            !/\p{Script=Telugu}/u.test(text) || text === chapter.blocks[blockIndex].text)) {
        throw new Error(`Invalid Telugu dialect passage: ${chapter.id}/${blockIndex}`);
      }
      previous = blockIndex;
      blocks[blockIndex].text = passage[variant];
    }
    return { ...chapter, blocks };
  });
  return { ...edition, dialect, chapters };
}
