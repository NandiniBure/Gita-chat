const fs = require("fs");
const path = require("path");
const { getChunks } = require("./chunk.service");
const { getEmbedding } = require("./embedding.service");

async function initRAG() {
  // ✅ async function
  try {
    console.log("🔄 Initializing RAG...");

    const dataPath = path.join(__dirname, "../data/gita.json");
    const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    const chunks = getChunks(rawData);

    console.log("SAMPLE CHUNKS:");
    console.log(JSON.stringify(chunks.slice(0, 3), null, 2));

    const vectorStore = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      console.log(`⚡ Embedding chunk ${i + 1}/${chunks.length}`);

      const embedding = await getEmbedding(chunk.text); // ✅ NOW VALID

      if (!embedding) continue;

      vectorStore.push({
        embedding,
        text: chunk.text,
        metadata: chunk.metadata,
      });
    }

    fs.writeFileSync(
      path.join(__dirname, "../data/vectorStore.json"),
      JSON.stringify(vectorStore, null, 2)
    );

    console.log("✅ RAG Initialized & Stored!");
  } catch (err) {
    console.error("❌ RAG Init Error:", err);
  }
}

module.exports = { initRAG };
