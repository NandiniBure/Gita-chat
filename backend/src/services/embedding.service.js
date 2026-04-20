const axios = require("axios");

async function getEmbedding(text) {
  try {
    const safeText = text.slice(0, 500); // 🔥 critical fix

    const response = await axios.post("http://localhost:11434/api/embeddings", {
      model: "nomic-embed-text",
      prompt: safeText,
    });

    return response.data.embedding;
  } catch (err) {
    console.error("❌ Embedding error:", err.response?.data || err.message);
    return null;
  }
}

module.exports = { getEmbedding };
