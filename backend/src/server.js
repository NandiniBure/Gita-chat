const express = require("express");
const fs = require("fs");
const path = require("path");

const { initRAG } = require("./services/rag.init");
const { generateAnswer } = require("./services/llm.service");
const { getEmbedding } = require("./services/embedding.service");
const cors = require("cors");
require("dotenv").config();
const supabase = require("./supabaseClient");

const app = express();
app.use(express.json()); // important
app.use(
  cors({
    origin: "http://localhost:8080",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
async function startServer() {
  const vectorPath = path.join(__dirname, "./data/vectorStore.json");

  if (
    !fs.existsSync(vectorPath) ||
    fs.readFileSync(vectorPath, "utf-8").trim() === "[]"
  ) {
    console.log("⚠️ Initializing RAG...");
    await initRAG();
  } else {
    console.log("✅ RAG ready");
  }

  function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }
  app.post("/chat", async (req, res) => {
    try {
      const { question } = req.body;

      // 🔥 auto create if not provided
      const chatId = req.body.chatId || crypto.randomUUID();

      function isCasualMessage(input) {
        const casualInputs = [
          "hi",
          "hello",
          "hey",
          "good morning",
          "good evening",
        ];
        return casualInputs.includes(input.toLowerCase().trim());
      }

      console.log(chatId);

      // 🔹 Fetch history
      const { data: chatData, error } = await supabase
        .from("chats")
        .select("messages")
        .eq("chat_id", chatId)
        .maybeSingle(); // ✅ safer

      if (error) {
        console.log("Fetch error:", error);
      }

      console.log(chatData);

      const history = chatData?.messages || [];

      if (isCasualMessage(question)) {
        const answer =
          "Hey! You can ask me anything about life, thoughts, or the Bhagavad Gita.";

        const newMessages = [
          ...history,
          { role: "user", text: question },
          { role: "assistant", text: answer },
        ];

        console.log("====>", newMessages);

        await supabase.from("chats").upsert({
          chat_id: chatId,
          messages: newMessages,
          updated_at: new Date(),
        });

        return res.json({ answer, sources: [] });
      }

      // 🔹 RAG logic
      const vectorStore = JSON.parse(fs.readFileSync(vectorPath, "utf-8"));
      const questionEmbedding = await getEmbedding(question);

      const scored = vectorStore.map((item) => ({
        ...item,
        score: cosineSimilarity(questionEmbedding, item.embedding),
      }));

      const topChunks = scored.sort((a, b) => b.score - a.score).slice(0, 3);

      const context = topChunks
        .map(
          (c) =>
            `Chapter ${c.metadata.chapter}, Verse ${c.metadata.verse}: ${c.text}`
        )
        .join("\n\n");

      const answer = await generateAnswer(context, question, history);

      const newMessages = [
        ...history,
        { role: "user", text: question },
        { role: "assistant", text: answer },
      ];

      const { error: upsertError } = await supabase.from("chats").upsert({
        chat_id: chatId,
        messages: newMessages,
        updated_at: new Date(),
      });
      if (upsertError) {
        console.error("Supabase upsert error:", upsertError);
      }

      const sources = topChunks.map((c) => c.metadata);

      res.json({ answer, sources });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  app.get("/", (req, res) => {
    res.send("Gita RAG running 🚀");
  });

  app.get("/chats", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("chat_id, updated_at, messages")
        .order("updated_at", { ascending: false });
   

        
      if (error) {
        console.error("Fetch chats error:", error);
        return res.status(500).json({ error: "Failed to fetch chats" });
      }

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  app.listen(3000, () => {
    console.log("✅ Server running on port 3000");
  });
}

startServer();
