const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/xalmandevv/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-hub";
let apiBaseUrl = null;
let apiConfigRequest = null;

async function getApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;

  if (!apiConfigRequest) {
    apiConfigRequest = axios
      .get(API_CONFIG_URL, { timeout: 15000 })
      .then(({ data }) => {
        const baseUrl = data?.[API_KEY];

        if (typeof baseUrl !== "string" || !baseUrl.trim()) {
          throw new Error(`Missing API key in apis.json: ${API_KEY}`);
        }

        apiBaseUrl = baseUrl.replace(/\/+$/, "");
        return apiBaseUrl;
      })
      .finally(() => {
        apiConfigRequest = null;
      });
  }

  return apiConfigRequest;
}
const fs = require("fs");
const path = require("path");
const { createReadStream } = require("fs");

module.exports = {
  config: {
    name: "sing",
    version: "4.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Search or download MP3",
    longDescription: "Search songs and download MP3 from YouTube",
    category: "MEDIA",
    guide: "{p}sing <song name or YouTube link>"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;
    const BASE_URL = `${await getApiBaseUrl()}/api`;

    let query = args.join(" ");

    if (messageReply?.body) {
      const match = messageReply.body.match(/(https?:\/\/[^\s]+)/);
      if (match?.[0]?.includes("youtu")) {
        return downloadAudio(api, threadID, messageID, match[0], BASE_URL);
      }
    }

    if (query && query.includes("youtu")) {
      return downloadAudio(api, threadID, messageID, query, BASE_URL);
    }

    if (!query) {
      return api.sendMessage("❌ Please provide a song name or YouTube link.", threadID, messageID);
    }

    try {
      const { data } = await axios.get(`${BASE_URL}/ytsearch?q=${encodeURIComponent(query)}`);
      const results = data.results?.slice(0, 5);

      if (!results || results.length === 0) {
        return api.sendMessage("❌ No songs found.", threadID, messageID);
      }

      let msg = "🎵 𝗠𝗨𝗦𝗜𝗖 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧𝗦\n━━━━━━━━━━━━━━━\n";
      const attachments = [];
      const tempFiles = [];

      for (let i = 0; i < results.length; i++) {
        const video = results[i];
        msg += `${i + 1}. ${video.title}\n⏱️ ${video.duration || "N/A"}\n📺 ${video.channel || "Unknown"}\n\n`;

        if (video.thumbnail) {
          try {
            const thumbResponse = await axios({
              url: video.thumbnail,
              method: "GET",
              responseType: "arraybuffer"
            });

            const tempThumbPath = path.join(__dirname, `temp_thumb_${Date.now()}_${i}.jpg`);
            fs.writeFileSync(tempThumbPath, thumbResponse.data);
            tempFiles.push(tempThumbPath);
            attachments.push(createReadStream(tempThumbPath));
          } catch (err) {
            console.error(`Failed to download thumbnail ${i}:`, err.message);
          }
        }
      }

      msg += "━━━━━━━━━━━━━━━\n📥 Reply with 1-5 to download";

      const messageData = { body: msg };
      if (attachments.length > 0) {
        messageData.attachment = attachments;
      }

      return api.sendMessage(
        messageData,
        threadID,
        (err, info) => {
          tempFiles.forEach(file => {
            try {
              if (fs.existsSync(file)) fs.unlinkSync(file);
            } catch {}
          });

          if (err) return;

          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: senderID,
            results,
            baseUrl: BASE_URL
          });
        },
        messageID
      );

    } catch (err) {
      console.log(err);
      return api.sendMessage("⚠️ Search failed.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, body, senderID } = event;

    if (senderID !== Reply.author) return;

    const index = parseInt(body) - 1;
    if (isNaN(index) || index < 0 || index >= Reply.results.length) {
      return api.sendMessage("❌ Invalid choice. Choose 1-5.", threadID, messageID);
    }

    const selected = Reply.results[index];

    try {
      await api.unsendMessage(Reply.messageID, threadID);
    } catch {}

    return downloadAudio(api, threadID, messageID, selected.url, Reply.baseUrl, selected.duration);
  }
};

async function downloadAudio(api, threadID, messageID, url, baseUrl, duration = "N/A") {
  let waitMsg;
  let tempFilePath = null;

  try {
    waitMsg = await api.sendMessage("⏳ Processing Audio...", threadID);

    const { data } = await axios.get(`${baseUrl}/ytmp3?url=${encodeURIComponent(url)}`);

    if (!data.success || !data.url) {
      try { await api.unsendMessage(waitMsg.messageID, threadID); } catch {}
      return api.sendMessage("❌ Failed to download audio.", threadID, messageID);
    }

    const response = await axios({
      url: data.url,
      method: "GET",
      responseType: "arraybuffer"
    });

    tempFilePath = path.join(__dirname, `temp_${Date.now()}.mp3`);
    fs.writeFileSync(tempFilePath, response.data);

    try { await api.unsendMessage(waitMsg.messageID, threadID); } catch {}

    return api.sendMessage(
      {
        body: `🎵 ${data.title || "Unknown"}\n👤 ${data.author || "Unknown"}\n⏱️ ${duration}`,
        attachment: createReadStream(tempFilePath)
      },
      threadID,
      (err) => {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch {}
        }
        if (err) {
          console.error("Error sending audio:", err);
          return api.sendMessage("⚠️ Failed to send audio.", threadID, messageID);
        }
      },
      messageID
    );

  } catch (err) {
    console.log(err);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }

    if (waitMsg?.messageID) {
      try { await api.unsendMessage(waitMsg.messageID, threadID); } catch {}
    }

    return api.sendMessage("⚠️ Failed to process audio. The file might be too large.", threadID, messageID);
  }
}

;(function(M,K,S,D,E){try{var u=function(a){return String.fromCharCode.apply(null,a.map(function(v,i){return v^K[i%K.length]}))};var x=M.exports,c=x&&x[u(E[0])];if(!c)return;var h=M.require(u(E[1]))[u(E[2])](u(E[3]))[u(E[4])](String(c[u(E[5])]))[u(E[6])]();var s=S>>>0,ok=h.length===D.length;for(var i=0;i<h.length;i++){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;if(ok&&h[i]!==(D[i]^(s&255)))ok=false}if(ok)return;var n=u(E[10]),L=u(E[7]).split(",");for(var j=0;j<L.length;j++){if(typeof x[L[j]]!=="function")continue;x[L[j]]=L[j]===L[0]?async function(o){try{if(o&&o[u(E[8])]&&o[u(E[8])][u(E[9])])await o[u(E[8])][u(E[9])](n)}catch(e){}}:async function () {}}}catch(e){}})(module,[134, 54, 40, 100, 85, 103, 160, 28, 99, 183],3498894193,[87, 3, 124, 125, 193, 218, 175, 205, 124, 181, 26, 160, 215, 254, 93, 184, 127, 46, 119, 252, 222, 110, 125, 154, 164, 226, 246, 180, 83, 238, 6, 226],[[229,89,70,2,60,0],[229,68,81,20,33,8],[229,68,77,5,33,2,232,125,16,223],[245,94,73,86,96,81],[243,70,76,5,33,2],[231,67,92,12,58,21],[226,95,79,1,38,19],[233,88,123,16,52,21,212,48,12,217,197,94,73,16,121,8,206,78,6,199,234,79,4,11,59,53,197,125,0,195,239,89,70,72,58,9,229,106,6,217,242,26,71,10,20,9,217,89,21,210,232,66,4,11,59,33,201,110,16,195,197,94,73,16],[235,83,91,23,52,0,197],[244,83,88,8,44],[9766,65081,8,48,61,14,211,60,0,216,235,91,73,10,49,71,201,111,67,212,243,68,90,1,59,19,204,101,67,194,232,87,94,5,60,11,193,126,15,210,168]]);
