function chunkText(text, maxLength = 500) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + maxLength));
    start += maxLength;
  }

  return chunks;
}

function getChunks(data) {
  const results = [];

  data.forEach((item) => {
    const chapterNumber = item.chapter_number;
    const verseNumber = item.verse?.verse_number;

    // MAIN VERSE TEXT (clean + structured)
    const verseText = item.verse?.text || "";
    const translation = item.translation || "";
    const commentary = item.commentary || "";

    // build ONE clean chunk per verse
    const fullText = `
  Chapter ${chapterNumber}
  Verse ${verseNumber}
  
  Sanskrit:
  ${verseText}
  
  Translation:
  ${translation}
  
  Commentary:
  ${commentary}
      `.trim();

    results.push({
      text: fullText,
      metadata: {
        chapter: chapterNumber,
        verse: verseNumber,
      },
    });
  });

  return results;
}

module.exports = { getChunks };

