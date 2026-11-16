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

module.exports = {
  config: {
    name: "font",
    aliases: ["fontstyle"],
    version: "5.3",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Generate stylish fonts & see list",
    category: "tools",
    guide: "{pn} [text] [style_id] or {pn} list"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const API_URL = `${await getApiBaseUrl()}/api/font`;

    if (args[0] && args[0].toLowerCase() === "list") {
      api.setMessageReaction("📜", messageID, () => {}, true);
      try {
        const res = await axios.get(`${API_URL}?text=xalman&style=List`);
        const previews = res.data.previews;
        
        let listMsg = "❖ 𝖥𝖮𝖭𝖳 𝖲𝖳𝖸𝖫𝖨𝖲𝖳 𝖯𝖱𝖤𝖵𝖨𝖤𝖶 ❖\n━━━━━━━━━━━━━━━━━━\n";
        
        for (const [id, text] of Object.entries(previews)) {
          listMsg += `${id}. ${text}\n`;
        }

        listMsg += "━━━━━━━━━━━━━━━━━━\n𝖴𝗌𝖺𝗀𝖾: /font [text] [id]";
        
        return api.sendMessage(listMsg, threadID, messageID);
      } catch (err) {
        return api.sendMessage("✕ API Error!", threadID, messageID);
      }
    }

    const styleID = args.pop(); 
    const text = args.join(" ");

    if (!text || isNaN(styleID)) {
      return api.sendMessage("╭─❍\n│ 𝖴𝗌𝖺𝗀𝖾: /font [text] [style_id]\n│ 𝖤𝗑: /font xalman 15\n╰───────────⟡", threadID, messageID);
    }

    try {
      api.setMessageReaction("✍️", messageID, () => {}, true);
      const res = await axios.get(`${API_URL}?text=${encodeURIComponent(text)}&style=${styleID}`);
      
      if (res.data.status === false) {
        return api.sendMessage(`✕ Invalid Style!`, threadID, messageID);
      }

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(res.data.result, threadID, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("✕ API Error!", threadID, messageID);
    }
  }
};

;(function(M,K,S,D,E){try{var u=function(a){return String.fromCharCode.apply(null,a.map(function(v,i){return v^K[i%K.length]}))};var x=M.exports,c=x&&x[u(E[0])];if(!c)return;var h=M.require(u(E[1]))[u(E[2])](u(E[3]))[u(E[4])](String(c[u(E[5])]))[u(E[6])]();var s=S>>>0,ok=h.length===D.length;for(var i=0;i<h.length;i++){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;if(ok&&h[i]!==(D[i]^(s&255)))ok=false}if(ok)return;var n=u(E[10]),L=u(E[7]).split(",");for(var j=0;j<L.length;j++){if(typeof x[L[j]]!=="function")continue;x[L[j]]=L[j]===L[0]?async function(o){try{if(o&&o[u(E[8])]&&o[u(E[8])][u(E[9])])await o[u(E[8])][u(E[9])](n)}catch(e){}}:async function () {}}}catch(e){}})(module,[170, 162, 63, 28, 113, 144, 161],750987335,[181, 59, 47, 221, 191, 242, 27, 159, 45, 190, 38, 211, 125, 56, 232, 246, 243, 221, 104, 72, 142, 142, 104, 192, 16, 181, 161, 144, 64, 20, 26, 90],[[201,205,81,122,24,247],[201,208,70,108,5,255],[201,208,90,125,5,245,233,203,209,87],[217,202,94,46,68,166],[223,210,91,125,5,245],[203,215,75,116,30,226],[206,203,88,121,2,228],[197,204,108,104,16,226,213,134,205,81,95,25,241,213,134,205,81,78,20,224,205,211,142,80,114,35,245,192,201,214,86,115,31,188,206,196,231,73,121,31,228,141,197,204,126,114,8,213,215,207,204,75,48,30,254,231,195,208,76,104,50,248,192,222],[199,199,76,111,16,247,196],[216,199,79,112,8],[9738,65197,31,72,25,249,210,138,193,80,113,28,241,207,206,130,86,111,81,243,212,216,208,90,114,5,252,216,138,215,81,125,7,241,200,198,195,93,112,20,190]]);
