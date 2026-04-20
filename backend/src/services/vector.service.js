let vectors = [];
let chunks = [];

function storeVectors(v, c) {
  vectors = v;
  chunks = c;
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

function search(queryVector, topK = 3) {
  const scores = vectors.map((vec, i) => ({
    score: cosineSimilarity(queryVector, vec),
    chunk: chunks[i],
  }));

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}

module.exports = { storeVectors, search };
