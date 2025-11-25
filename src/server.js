const express = require('express');
const path = require('path');
const app = express();
const TokenStore = require('./token-store.js');
module.exports = TokenStore;
const port = process.env.PORT || 3000;
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});
const cors = require("cors")
app.use(cors({
  origin: ["http://127.0.0.1:5500"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

// 2. Zugriff auf die Umgebungsvariablen
const clientId = process.env.LINKEDIN_CLIENT_ID;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
const sessions = {};

// Optional: prüfen, ob sie undefined sind
if (!clientId || !clientSecret) {
  console.error("Fehler: .env-Variablen nicht gefunden!");
  process.exit(1);
}

// Statische Dateien bereitstellen (index.html)
app.use(express.static(path.join(__dirname)));
    
app.get('/', (req, res) => {
    res.send('Hallo! linkedin backend läuft..');
});

// Callback-Route für LinkedIn
app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    console.log("calling /auth/callback")
    const redirectUri = `https://lslinkedinbackend.azurewebsites.net/auth/callback`; // redirect für das Token
    
    if (!code) {
        return res.send("No authorization code" );
    }
    const params = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
    });
        try {
            const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
            });

            if (!response.ok) {
                throw new Error(`LinkedIn Token Error: ${response.status}`);
            }

            const data = await response.json();
            console.log("TOKEN RESPONSE:", data);
            // Einfach Anzeige des Codes im Browser
            /*res.send(`
                <h1>LinkedIn OAuth Callback</h1>
                <p>Authorization Code: <strong>${code}</strong></p>
                <p>State: <strong>${state}</strong></p>
                <p>Du kannst diesen Code jetzt verwenden, um ein Access Token auf dem Server anzufordern.</p>
                <p>access_token: <strong>${data.access_token}</strong></p>
            `);*/
            res.redirect(`/token/callback/?myToken=${data.access_token}`)

            // Test redirect zum Client
              // Token speichern
        //TokenStore.saveTokens(data.access_token);
            //res.redirect("http://127.0.0.1:5500/frontend/index.html?status=success");
        } catch (err) {
            console.error("Fehler beim Token holen:", err);
        }
});

// Callback-Route für LinkedIn
app.get('/token/callback', async (req, res) => {
    try {
        const token = req.query.myToken;
        console.log("TOKEN:", token);

        const response = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "X-Restli-Protocol-Version": "2.0.0"
            }
        });

        const data = await response.text();
        console.log("LINKEDIN RESPONSE:", data);

        let json;
        try {
            json = JSON.parse(data);
        } catch(e) {
            console.error("JSON Parse Error", e);
            return res.send("LinkedIn returned invalid JSON: " + data);
        }

        const sessionId = Math.random().toString(36).substring(2, 10);
        sessions[sessionId] = json;

        console.log("REDIRECT to myapp://auth?session=" + sessionId);
        res.redirect(`myapp://auth?session=${encodeURIComponent(sessionId)}`);

    } catch (err) {
        console.error("Fehler:", err);
        res.send("ERROR: " + err.message);
    }
});


// 5. Cordova holt Daten ab
app.get("/result", (req, res) => {
    const session = req.query.session;
    const data = sessions[session];

    if (!data) return res.status(404).json({ error: "session not found" });

    res.json({ data });

    // optional: Session löschen
    delete sessions[session];
});

app.get("/api/linkedin/adaccounts", async (req, res) => {
    const token = req.query.myToken; //req.query.myToken
  try {
    // LinkedIn REST endpoint
    //const tokens = TokenStore.loadTokens();
    if (!token) {
        return res.status(401).json({ error: "No access token" });
    }

    const LINKEDIN_AD_ACCOUNTS_URL = "https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))";
    const response = await fetch(LINKEDIN_AD_ACCOUNTS_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "LinkedIn-Version": "202401",  // oder aktuelle Version falls nötig
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    res.json(data);

  } catch (err) {
    console.error("Fehler beim LinkedIn Request:", err);
    res.status(500).json({ error: "Serverfehler beim Abruf der Konten" });
  }
});

// Callback-Route für LinkedIn2
app.get('/token/callback2', (req, res) => {
    const token = req.query.myToken; //req.query.myToken

    // Einfach Anzeige des Codes im Browser
    //res.send(`
     //   <p>Du kannst diesen Token jetzt verwenden, um weitere Daten von linkedin anzufordern. <strong>${token}</strong> </p>
    //`);

    (async () => {
        try {
            const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-RestLi-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json'
            }
            });

            if (!response.ok) {
            throw new Error(`Fehler: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('LinkedIn Ad Accounts:', data);
        } catch (error) {
            console.error('Fehler beim Abrufen der LinkedIn Ad Accounts:', error.message);
        }
    })();
});

app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
