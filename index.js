const { useMultiFileAuthState, MessageOptions, Mimitype } = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const pino = require("pino");
const express = require("express");
const bodyParser = require("body-parser");
const { error } = require("qrcode-terminal");
const { Socket } = require("socket.io");
const app = express();
app.use(bodyParser.json());

async function connectToWa() {
  const auth = await useMultiFileAuthState("auth");
  const socket = makeWASocket({
    printQRInTerminal: true,
    auth: auth.state,
    logger: pino({ level: "silent" }),
  });
  socket.ev.on("creds.update", auth.saveCreds);
  socket.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") console.log("nomor:" + socket.user.id.split(":")[0]);
    if (connection === "close") connectToWa();
  });
  socket.ev.on("messages.upsert", ({ messages }) => {
    const msg = messages[0];
    console.log(msg);
  });

  // endpoint
  app.post("/send", async (req, res) => {
    const { phoneNumber, message } = req.body;
    if (socket && phoneNumber && message) {
      try {
        const waMessage = {
          text: message,
        };
        await socket.sendMessage(phoneNumber, message);
        res.send(`pesan ${message}, nomor ${phoneNumber}`);
      } catch (error) {
        console.error("yah gagal:", error);
        res.send("gagal", +error.message);
      }
    } else {
      res.status(400).send("gagal lagi");
    }
  });

  // Endpoint untuk mengirim pesan media ke nomor WhatsApp
  app.post("/send-media", async (req, res) => {
    const { phoneNumber, mediaURL, caption } = req.body;
    if (socket && phoneNumber && mediaURL) {
      try {
        await socket.sendImage(phoneNumber, mediaURL, caption);
        res.send(`Pesan media terkirim ke ${phoneNumber}`);
      } catch (error) {
        res.status(500).send("Gagal mengirim pesan media");
      }
    } else {
      res.status(400).send("Parameter yang diperlukan tidak lengkap");
    }
  });

  // Endpoint untuk mengirim pesan media ke grup WhatsApp
  app.post("/send-media-group", async (req, res) => {
    const { groupId, mediaURL, caption } = req.body;
    if (socket && groupId && mediaURL) {
      try {
        await socket.sendImage(groupId, mediaURL, caption, { chatId: groupId, isGroup: true });
        res.send(`Pesan media terkirim ke grup ${groupId}`);
      } catch (error) {
        res.status(500).send("Gagal mengirim pesan media");
      }
    } else {
      res.status(400).send("Parameter yang diperlukan tidak lengkap");
    }
  });
}
connectToWa();
// ===========
app.listen(2005, () => {
  console.log("server running");
});
