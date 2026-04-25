const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const supabase = require("./supabaseClient");
const { initRAG } = require("./services/rag.init");
const { getEmbedding } = require("./services/embedding.service");
const { generateAnswer, streamAnswer } = require("./services/llm.service");

const app = express();
app.use(express.json());

const cors = require("cors");
app.use(cors());

// -----------------------------
// INIT SERVER (only DB RAG now)
// -----------------------------
async function startServer() {
  try {
    console.log("🚀 Starting server...");

    // Optional: only run once for seeding
    const { count } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true });

    if (!count || count === 0) {
      console.log("⚠️ No embeddings found. Initializing RAG...");
      await initRAG();
    } else {
      console.log("✅ RAG ready (Supabase)");
    }

    // -----------------------------
    // CHAT ROUTE
    // -----------------------------

    app.post("/chat", async (req, res) => {
      try {
        const { question } = req.body;
        const chatId = req.body.chatId || crypto.randomUUID();

        const isCasualMessage = (input) => {
          const casualInputs = [
            "hi",
            "hello",
            "hey",
            "good morning",
            "good evening",
          ];
          return casualInputs.includes(input.toLowerCase().trim());
        };

        // -----------------------------
        // FETCH CHAT HISTORY
        // -----------------------------
        const { data: chatData } = await supabase
          .from("chats")
          .select("messages")
          .eq("chat_id", chatId)
          .maybeSingle();

        const history = chatData?.messages || [];

        // -----------------------------
        // CASUAL RESPONSE FLOW (UNCHANGED)
        // -----------------------------
        if (isCasualMessage(question)) {
          const answer =
            "Hey! You can ask me anything about life, thoughts, or the Bhagavad Gita.";

          const newMessages = [
            ...history,
            { role: "user", text: question },
            { role: "assistant", text: answer },
          ];

          await supabase.from("chats").upsert({
            chat_id: chatId,
            messages: newMessages,
          });

          return res.json({ answer, sources: [] });
        }

        // -----------------------------
        // RAG FLOW (UNCHANGED)
        // -----------------------------
        const questionEmbedding = await getEmbedding(question);

        const { data: chunks, error } = await supabase.rpc("match_documents", {
          query_embedding: questionEmbedding,
          match_threshold: 0.3,
          match_count: 3,
        });

        if (error) {
          console.error("Vector search error:", error);
        }

        const topChunks = chunks || [];

        const context = topChunks
          .map(
            (c) =>
              `Chapter ${c.metadata.chapter}, Verse ${c.metadata.verse}: ${c.content}`
          )
          .join("\n\n");

        // =============================
        // 🔥 STREAMING STARTS HERE
        // =============================

        // 🔥 headers for streaming
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Cache-Control", "no-cache");
        res.flushHeaders();

        const stream = await streamAnswer(context, question, history);

        let fullAnswer = "";

        stream.on("data", (chunk) => {
          const lines = chunk.toString().split("\n").filter(Boolean);

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              const token = parsed.response || "";

              fullAnswer += token;

              res.write(token); // 🚀 send token
            } catch (e) {
              // ignore partial JSON
            }
          }
        });

        stream.on("end", async () => {
          // -----------------------------
          // SAVE CHAT (same logic)
          // -----------------------------
          const newMessages = [
            ...history,
            { role: "user", text: question },
            { role: "assistant", text: fullAnswer },
          ];

          await supabase.from("chats").upsert({
            chat_id: chatId,
            messages: newMessages,
          });

          res.end(); // 🔥 close stream
        });

        stream.on("error", (err) => {
          console.error("Stream error:", err);
          res.end("Error");
        });
      } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ error: "Something went wrong" });
      }
    });
    // -----------------------------
    // GET ALL CHATS
    // -----------------------------
    app.get("/chats", async (req, res) => {
      try {
        const { data, error } = await supabase
          .from("chats")
          .select("chat_id, updated_at, messages")
          .order("updated_at", { ascending: true });

        if (error) {
          console.error(error);
          return res.status(500).json({ error: "Failed to fetch chats" });
        }

        res.json(data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
      }
    });

    // -----------------------------
    // HEALTH CHECK
    // -----------------------------
    app.get("/", (req, res) => {
      res.send("Gita RAG running with Supabase 🚀");
    });

    app.listen(3000, () => {
      console.log("✅ Server running on port 3000");
    });
  } catch (err) {
    console.error("Server start error:", err);
  }
}

startServer();
