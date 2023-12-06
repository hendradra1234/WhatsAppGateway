const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const { makeWASocket, MessageType, Mimetype } = require("@whiskeysockets/baileys");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const bodyParser = require("body-parser");
const qrcode = require("qrcode");

//========
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

// Fungsi untuk koneksi ke WhatsApp
async function connectToWhatsApp() {
  try {
    const conn = makeWASocket();
    conn.logLevel = "debug";

    conn.on("open", () => {
      console.log("WhatsApp terkoneksi");
    });

    conn.on("close", ({ reason, isReconnecting }) => {
      console.log({ reason, isReconnecting });
    });

    conn.on("auth-state-update", () => {
      console.log("Credentials updated!");
    });

    conn.on("chat-update", (chatUpdate) => {
      console.log({ chatUpdate });
    });

    await conn.connect();
    return conn; // Mengembalikan koneksi yang sudah terbentuk
  } catch (error) {
    console.error("Gagal terkoneksi ke WhatsApp:", error);
    throw error;
  }
}

// connectToWhatsApp().catch((err) => console.log("Error:", err));

// Endpoint untuk mengirim pesan teks ke nomor WhatsApp
app.post("/send", async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ error: "Nomor atau pesan kosong" });
    }
    const conn = await connectToWhatsApp();
    const result = await conn.sendMessage(`${number}@s.whatsapp.net`, { text: message }, MessageType.text);
    res.status(200).json({ message: "Pesan terkirim", result });
  } catch (error) {
    console.error("Gagal mengirim pesan:", error);
    res.status(500).json({ error: "Gagal mengirim pesan" });
  }
});

// Endpoint untuk mengirim pesan teks ke grup WhatsApp
app.post("/send-group", async (req, res) => {
  try {
    const { groupId, message } = req.body;
    if (!groupId || !message) {
      return res.status(400).json({ error: "ID grup dan pesan diperlukan" });
    }

    const conn = await connectToWhatsApp(); // Mengambil koneksi yang sudah terbentuk
    const result = await conn.sendMessage(groupId, { text: message }, MessageType.text);
    res.status(200).json({ message: "Pesan terkirim ke grup", result });
  } catch (error) {
    console.error("Gagal mengirim pesan ke grup:", error);
    res.status(500).json({ error: "Gagal mengirim pesan ke grup" });
  }
});

// Endpoint untuk mengirim pesan media (gambar, audio, dokumen) ke nomor WhatsApp
app.post("/send-media", async (req, res) => {
  try {
    const { number, mediaUrl, caption } = req.body;

    if (!number || !mediaUrl) {
      return res.status(400).json({ error: "Nomor dan URL media diperlukan" });
    }

    const conn = await connectToWhatsApp(); // Mengambil koneksi yang sudah terbentuk
    const messageType = mediaUrl.endsWith(".mp4") ? MessageType.video : MessageType.image;
    const mediaType = MessageType.video; // Ganti dengan MessageType.video untuk video, atau MessageType.image untuk gambar

    // Jika ingin mengirim audio, ubah tipe pesan menjadi MessageType.audio

    const options = { caption: caption || "" }; // Optional, caption for the media
    const result = await conn.sendMessage(number + "@s.whatsapp.net", { [mediaType]: mediaUrl }, options);
    res.status(200).json({ message: "Pesan media terkirim", result });
  } catch (error) {
    console.error("Gagal mengirim pesan media:", error);
    res.status(500).json({ error: "Gagal mengirim pesan media" });
  }
});

// Endpoint untuk mengirim pesan media (gambar, audio, dokumen) ke grup WhatsApp
app.post("/send-media-group", async (req, res) => {
  try {
    const { groupId, mediaUrl, caption } = req.body;

    if (!groupId || !mediaUrl) {
      return res.status(400).json({ error: "ID grup dan URL media diperlukan" });
    }

    const conn = await connectToWhatsApp(); // Mengambil koneksi yang sudah terbentuk
    const messageType = mediaUrl.endsWith(".mp4") ? MessageType.video : MessageType.image;
    const mediaType = MessageType.video; // Ganti dengan MessageType.video untuk video, atau MessageType.image untuk gambar

    // Jika ingin mengirim audio, ubah tipe pesan menjadi MessageType.audio

    const options = { caption: caption || "" }; // Optional, caption for the media
    const result = await conn.sendMessage(groupId + "@s.whatsapp.net", { [mediaType]: mediaUrl }, options);
    res.status(200).json({ message: "Pesan media terkirim ke grup", result });
  } catch (error) {
    console.error("Gagal mengirim pesan media ke grup:", error);
    res.status(500).json({ error: "Gagal mengirim pesan media ke grup" });
  }
});

// Endpoint untuk melakukan scan QR WhatsApp via web
app.get("/scan", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Fungsi socket untuk koneksi antara server dan klien
io.on("connection", async (socket) => {
  console.log("user connected");
  try {
    const conn = await connectToWhatsApp();
    socket.on("clientMessage", async (message) => {
      console.log("Message from client:", message);
      // Lakukan operasi yang diperlukan dengan koneksi WhatsApp di sini
    });
  } catch (error) {
    console.error("Error connecting to WhatsApp inside socket:", error);
  }

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Memulai koneksi ke WhatsApp dan menjalankan server Express
connectToWhatsApp()
  .then(() => {
    const port = process.env.PORT || 3030;
    http.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => console.log("Unexpected error: " + err));
