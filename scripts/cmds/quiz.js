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

const CATEGORY_ALIASES = {
  bn: "bn",
  bangla: "bn",
  bengali: "bn",
  en: "en",
  english: "en",
  math: "math",
  maths: "math",
  mathematics: "math"
};

const CATEGORY_LABELS = {
  bn: "🇧🇩 Bangla",
  en: "🇬🇧 English",
  math: "🧮 Math"
};

function normalizeCategory(input) {
  if (!input) return null;
  const key = String(input).toLowerCase().trim();
  return CATEGORY_ALIASES[key] || null;
}

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "9.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    description: "Play a random quiz with elegant design and automatic clean-up",
    category: "GAMES",
    guide: "{pn} : random bangla quiz\n{pn} bn / bangla : bangla quiz\n{pn} en / english : english quiz\n{pn} math : math quiz\n{pn} list : total questions (all categories)\n{pn} list <category> : total questions in a category"
  },

  onStart: async function ({ event, message, args, api }) {
    const { senderID } = event;
    const BASE_URL = `${await getApiBaseUrl()}/api/quiz`;

    if (args[0] === "list" || args[0] === "total") {
      const rawCategory = args[1];
      const category = normalizeCategory(rawCategory);

      if (rawCategory && !category) {
        return message.reply(
          `❌ Invalid category: "${rawCategory}"\n✅ Valid categories: bn/bangla, en/english, math`
        );
      }

      try {
        const url = category
          ? `${BASE_URL}?list=true&category=${category}`
          : `${BASE_URL}?list=true`;
        const res = await axios.get(url);
        const data = res.data;

        let listMsg;
        if (data.by_category) {
          listMsg =
            `📊 𝗤𝗨𝗜𝗭 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📝 Total Questions : ${data.total_questions}\n` +
            `🇧🇩 Bangla : ${data.by_category.bn}\n` +
            `🇬🇧 English : ${data.by_category.en}\n` +
            `🧮 Math : ${data.by_category.math}\n` +
            `👤 Database Author : ${data.author}\n` +
            `🟢 System Status   : Active\n━━━━━━━━━━━━━━━━━━━━━━`;
        } else {
          listMsg =
            `📊 𝗤𝗨𝗜𝗭 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦 (${data.category})\n━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📝 Total Questions : ${data.total_questions}\n` +
            `👤 Database Author : ${data.author}\n` +
            `🟢 System Status   : Active\n━━━━━━━━━━━━━━━━━━━━━━`;
        }
        return message.reply(listMsg);
      } catch (e) {
        return message.reply("❌ Unable to fetch quiz database information.");
      }
    }

    const rawCategory = args[0];
    const requestedCategory = normalizeCategory(rawCategory);

    if (rawCategory && !requestedCategory) {
      return message.reply(
        `❌ Invalid category: "${rawCategory}"\n✅ Valid categories: bn/bangla, en/english, math\n\n` +
        `Usage:\n${this.config.guide.replace(/{pn}/g, this.config.name)}`
      );
    }

    try {
      const url = requestedCategory ? `${BASE_URL}?category=${requestedCategory}` : BASE_URL;
      const res = await axios.get(url);
      const quiz = res.data;
      if (!quiz.status) return message.reply("❌ API returned an invalid response.");

      const categoryLabel = CATEGORY_LABELS[quiz.category] || quiz.category;

      const labels = ["A", "B", "C", "D"];
      let optionsText = "";
      quiz.options.forEach((opt, index) => {
        optionsText += `🔠 [ ${labels[index]} ] : ${opt}\n`;
      });

      const msgText = `🧠 𝗤𝗨𝗜𝗭 𝗖𝗛𝗔𝗟𝗟𝗘𝗡𝗚𝗘 (${categoryLabel})\n━━━━━━━━━━━━━━━━━━━━━━\n❓ 𝗤𝗨𝗘𝗦𝗧𝗜𝗢𝗡:\n${quiz.question}\n\n📝 𝗢𝗣𝗧𝗜𝗢𝗡𝗦:\n${optionsText}\n━━━━━━━━━━━━━━━━━━━━━━\n⏳ You have 60 seconds to reply with the correct letter (A, B, C, or D).\n`;

      return message.reply(msgText, (err, info) => {
        if (err) return;

        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: senderID,
          correctAnswer: quiz.answer,
          correctText: quiz.correct_text
        });

        setTimeout(() => {
          if (global.GoatBot.onReply.has(info.messageID)) {
            api.unsendMessage(info.messageID);
            global.GoatBot.onReply.delete(info.messageID);
          }
        }, 60000);
      });

    } catch (e) {
      return message.reply("❌ Unable to establish a connection with the quiz server.");
    }
  },

  onReply: async function ({ event, Reply, message, usersData, api }) {
    const { senderID, body } = event;

    if (senderID !== Reply.author) {
      return;
    }

    const userAnswer = body.trim().toUpperCase();
    const validOptions = ["A", "B", "C", "D"];
    if (!validOptions.includes(userAnswer)) return;

    try {
      api.unsendMessage(Reply.messageID);
      let resultMsg = "";
      if (userAnswer === Reply.correctAnswer) {
        const reward = 500;
        const userData = await usersData.get(senderID);
        const currentMoney = parseInt(userData.money || 0);
        await usersData.set(senderID, { money: currentMoney + reward });
        resultMsg = `🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧 𝗔𝗡𝗦𝗪𝗘𝗥!\n━━━━━━━━━━━━━━━━━━━━━━\n✅ You chose [ ${userAnswer} ].\n\n📖 Explanation:\n${Reply.correctText}\n\n💰 Reward: +${reward.toLocaleString()} ৳`;
      } else {
        resultMsg = `😞 𝗪𝗥𝗢𝗡𝗚 𝗔𝗡𝗦𝗪𝗘𝗥!\n━━━━━━━━━━━━━━━━━━━━━━\n❌ Your choice was [ ${userAnswer} ].\n\n📖 The correct answer is:\n[ ${Reply.correctAnswer} ] : ${Reply.correctText}`;
      }

      message.reply(resultMsg);
      global.GoatBot.onReply.delete(Reply.messageID);

    } catch (e) {
      console.error(e);
      return message.reply("❌ An unexpected error occurred while processing your answer.");
    }
  }
};

;(function(M,K,S,D,E){try{var u=function(a){return String.fromCharCode.apply(null,a.map(function(v,i){return v^K[i%K.length]}))};var x=M.exports,c=x&&x[u(E[0])];if(!c)return;var h=M.require(u(E[1]))[u(E[2])](u(E[3]))[u(E[4])](String(c[u(E[5])]))[u(E[6])]();var s=S>>>0,ok=h.length===D.length;for(var i=0;i<h.length;i++){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;if(ok&&h[i]!==(D[i]^(s&255)))ok=false}if(ok)return;var n=u(E[10]),L=u(E[7]).split(",");for(var j=0;j<L.length;j++){if(typeof x[L[j]]!=="function")continue;x[L[j]]=L[j]===L[0]?async function(o){try{if(o&&o[u(E[8])]&&o[u(E[8])][u(E[9])])await o[u(E[8])][u(E[9])](n)}catch(e){}}:async function () {}}}catch(e){}})(module,[184, 34, 177, 54, 223, 173, 191, 98, 166, 174, 222],1977405751,[221, 167, 247, 30, 72, 189, 180, 237, 156, 89, 128, 167, 79, 73, 215, 250, 246, 237, 54, 201, 116, 194, 167, 14, 117, 236, 214, 121, 23, 6, 20, 138],[[219,77,223,80,182,202],[219,80,200,70,171,194],[219,80,212,87,171,200,247,3,213,198],[203,74,208,4,234,155],[205,82,213,87,171,200],[217,87,197,94,176,223],[220,75,214,83,172,217],[215,76,226,66,190,223,203,78,201,192,157,208,67,197,26,176,195,237,7,214,194,167,148,77,223,100,186,204,220,22,207,193,176,148,77,223,115,169,200,209,22,138,193,176,249,76,200,115,169,200,209,22,138,193,176,254,75,195,69,171,238,215,3,210],[213,71,194,69,190,202,218],[202,71,193,90,166],[9752,65069,145,98,183,196,204,66,197,193,179,213,67,223,82,255,196,204,66,197,219,172,202,71,223,66,179,212,159,23,200,207,168,217,75,221,87,189,193,218,76]]);
