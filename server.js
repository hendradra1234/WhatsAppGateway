const { DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys");

const makeWASocket = require("@whiskeysockets/baileys").default;

async function connectionlogic() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};
    if (qr) {
      console.log(qr);
    }
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        connectionlogic();
      }
    }
  });
  sock.ev.on("messages.update", (messageInfo) => {
    console.log(messageInfo);
  });
  sock.ev.on("messages.upsert", (messageInfoUpsert) => {
    console.log(messageInfoUpsert);
  });
  sock.ev.on("creds.update", saveCreds);
}

connectionlogic();
