// token-store.js (CommonJS)
const fs = require("fs");

const TOKEN_FILE = "./token-store.json";

// Datei anlegen, falls sie nicht existiert
if (!fs.existsSync(TOKEN_FILE)) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({}), "utf8");
}

module.exports = {
  saveTokens(tokens) {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
  },

  loadTokens() {
    try {
      const raw = fs.readFileSync(TOKEN_FILE, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
};
