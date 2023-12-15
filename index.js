const { useMultiFileAuthState, MessageType, MessageOptions, Mimitype } = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const pino = require("pino");
const express = require("express");
const bodyParser = require("body-parser");
const { error } = require("qrcode-terminal");
const { Socket } = require("socket.io");
const path = require("path");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
  app.get("/someone", (req, res) => {
    res.sendFile(path.join(__dirname, "./html/someone.html"));
  });
  app.get("/group", (req, res) => {
    res.sendFile(path.join(__dirname, "./html/group.html"));
  });

  // Endpoint untuk mengirim pesan teks ke nomor WhatsApp (DONE)
  app.post("/send", async (req, res) => {
    const phoneNumber = req.body.phoneNumber;
    const pesan = req.body.pesan;
    console.log("nomor:", phoneNumber);
    console.log("pesan:", pesan);
    console.log(typeof pesan);
    const apa = {
      text: pesan,
    };
    try {
      await socket.sendMessage(phoneNumber, { text: pesan });
      res.send({ message: "okee" });
    } catch (error) {
      console.error(`error nih: ${error.message}`);
    }
  });

  // Endpoint untuk mengirim pesan media ke nomor WhatsApp (DONE)
  app.post("/send-media", async (req, res) => {
    const { phoneNumber, mediaURL, caption } = req.body;
    try {
      await socket.sendMessage(phoneNumber, { image: { url: mediaURL } }, { caption: caption });
      res.send(`pesan berhasil terkirim`);
    } catch (error) {
      console.error(`ada yang error nih:${error.message}`);
    }
  });

  // Endpoint untuk mengirim pesan media ke grup WhatsApp
  app.post("/send-media-group", async (req, res) => {
    const { groupId, mediaURL, caption } = req.body;
    console.log("id group:", groupId);
    console.log("url:", mediaURL);
    console.log("caption:", caption);
    try {
      await socket.sendMessage(groupId, { image: { url: mediaURL } }, { caption: caption });
      res.send(`berhasil terkirim `);
    } catch (error) {
      console.log(`ada error nih:${error.message}`);
    }
  });
}
connectToWa();
// ===========
app.listen(2006, () => {
  console.log("server running");
});
