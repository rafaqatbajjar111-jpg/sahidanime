import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

// Initialize Firebase Admin
// Note: In this environment, we might not have a service account file.
// We'll try to initialize with the project ID.
const adminApp = initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Telegram Bot Logic
  let bot: TelegramBot | null = null;

  async function initBot() {
    try {
      const settingsSnap = await db.collection("settings").doc("telegram").get();
      const settings = settingsSnap.data();
      const token = process.env.TELEGRAM_BOT_TOKEN || settings?.botToken;

      if (token) {
        bot = new TelegramBot(token, { polling: true });
        console.log("Telegram Bot initialized in polling mode.");

        bot.onText(/\/start/, (msg) => {
          const chatId = msg.chat.id;
          bot?.sendMessage(chatId, "Welcome to SahidAnime Admin Bot! 👑\n\nUse the buttons below to manage redeem codes.", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎟️ Generate Redeem Code", callback_data: "show_plans" }],
                [{ text: "📊 View Recent Codes", callback_data: "view_codes" }]
              ]
            }
          });
        });

        bot.on("callback_query", async (query) => {
          const chatId = query.message?.chat.id;
          if (!chatId) return;

          if (query.data === "show_plans") {
            const plansSnap = await db.collection("plans").get();
            const plans = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (plans.length === 0) {
              bot?.sendMessage(chatId, "No plans found in database.");
              return;
            }

            const keyboard = plans.map((plan: any) => ([
              { text: `🎁 ${plan.name}`, callback_data: `gen_${plan.id}` }
            ]));

            bot?.sendMessage(chatId, "Select a plan to generate a code for:", {
              reply_markup: { inline_keyboard: keyboard }
            });
          } else if (query.data?.startsWith("gen_")) {
            const planId = query.data.replace("gen_", "");
            const planSnap = await db.collection("plans").doc(planId).get();
            const plan = planSnap.data();

            if (!plan) {
              bot?.sendMessage(chatId, "Plan not found.");
              return;
            }

            // Generate a random code
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const codeId = code;

            await db.collection("redeemCodes").doc(codeId).set({
              planId: planId,
              planName: plan.name,
              maxUses: 1,
              usedCount: 0,
              usedBy: [],
              createdAt: FieldValue.serverTimestamp(),
              createdBy: "Telegram Bot"
            });

            const appUrl = process.env.APP_URL || settings?.appUrl || 'your-app-url';
            bot?.sendMessage(chatId, `✅ **Code Generated Successfully!**\n\n📦 **Plan:** ${plan.name}\n✨ **Code:** \`${codeId}\`\n\nUser ko ye code aur link bhej dein:\n${appUrl}/redeem`, {
              parse_mode: "Markdown"
            });
          } else if (query.data === "view_codes") {
            const codesSnap = await db.collection("redeemCodes").orderBy("createdAt", "desc").limit(5).get();
            const codes = codesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (codes.length === 0) {
              bot?.sendMessage(chatId, "No codes found.");
              return;
            }

            let message = "📊 **Recent Redeem Codes:**\n\n";
            codes.forEach((c: any) => {
              message += `• \`${c.id}\` (${c.planName}) - ${c.usedCount}/${c.maxUses} used\n`;
            });

            bot?.sendMessage(chatId, message, { parse_mode: "Markdown" });
          }

          bot?.answerCallbackQuery(query.id);
        });
      } else {
        console.warn("Telegram Bot Token not found. Bot disabled.");
      }
    } catch (error) {
      console.error("Error initializing Telegram Bot:", error);
    }
  }

  initBot();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
