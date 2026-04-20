const fs = require("fs");
const path = require("path");

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/gita.json"), "utf-8")
);

// 🔹 helper: format each entry
function formatVerse(v) {
  return {
    verse_id: v.verse_id,
    chapter_number: v.chapter_number,

    chapter_name: v.chapter?.name,
    chapter_summary: v.chapter?.chapter_summary,

    text: `
Chapter ${v.chapter_number} - ${v.chapter?.name}

Summary: ${v.chapter?.chapter_summary}
    `.trim(),
  };
}

function searchVerses(query) {
  const q = query.toLowerCase();
  const keywords = q.split(" ");

  return data
    .map((v) => {
      const chapter = v.chapter || {};

      const chapterText = (chapter.chapter_summary || "").toLowerCase();
      const chapterName = (chapter.name || "").toLowerCase();

      // 👉 NEW: include verse identity
      const verseText = `${v.verse_id} ${v.chapter_number}`.toLowerCase();

      let score = 0;

      for (let word of keywords) {
        if (chapterText.includes(word)) score += 1;
        if (chapterName.includes(word)) score += 1;
        if (verseText.includes(word)) score += 0.5;
      }

      return {
        verse_id: v.verse_id,
        chapter_number: v.chapter_number,
        chapter_name: chapter.name,
        chapter_summary: chapter.chapter_summary,
        score,
      };
    })
    .filter((v) => v.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
module.exports = {
  searchVerses,
};
