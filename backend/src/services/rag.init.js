const fs = require("fs");
const path = require("path");
const { getChunks } = require("./chunk.service");
const { getEmbedding } = require("./embedding.service");
const supabase = require("../supabaseClient"); // ✅ your client

async function initRAG() {
  try {
    console.log("🔄 Initializing RAG...");

    const dataPath = path.join(__dirname, "../data/gita.json");
    const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    const chunks = getChunks(rawData);

    console.log("📦 Total chunks:", chunks.length);
    console.log("SAMPLE CHUNKS:");
    console.log(JSON.stringify(chunks.slice(0, 3), null, 2));

    const batchSize = 10; // ⚡ adjust if needed

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      console.log(`⚡ Processing batch ${i / batchSize + 1}`);

      // 🔥 parallel embedding
      const embeddings = await Promise.all(
        batch.map((chunk) => getEmbedding(chunk.text))
      );

      const records = batch
        .map((chunk, idx) => ({
          content: chunk.text,
          metadata: chunk.metadata,
          embedding: embeddings[idx],
        }))
        .filter((r) => r.embedding);

      if (records.length === 0) continue;

      const { error } = await supabase.from("documents").insert(records);

      if (error) {
        console.error("❌ Insert error:", error);
      }
    }

    console.log("✅ RAG Initialized & Stored in Supabase!");
  } catch (err) {
    console.error("❌ RAG Init Error:", err);
  }
}

module.exports = { initRAG };
