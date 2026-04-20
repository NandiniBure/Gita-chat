const { getEmbedding } = require("../services/embedding.service");
const vectorService = require("../services/vector.service");
const { generateAnswer } = require("../services/llm.service");

async function chat(req, res) {
  try {
    const { message } = req.body;

    const queryVector = await getEmbedding(message);

    const topChunks = vectorService.search(queryVector, 3);

    const context = topChunks.map((c) => c.text).join("\n\n");

    const answer = await generateAnswer(context, message);

    res.json({
      answer,
      sources: topChunks.map((c) => c.metadata),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { chat };
