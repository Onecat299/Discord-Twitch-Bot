require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js')
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
})

const app = express();
const port = process.env.PORT || 3000;

const twitchClientID = process.env.TWITCH_CLIENT_ID;
const twitchSecret = process.env.TWITCH_SECRET;
const twitchStreamer = process.env.STREAMER_NAME;
const discordChannelID = process.env.DISCORD_CHANNEL_ID;
let twitchToken;
let isLive = false;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Log In our bot
client.login(process.env.DISCORD_BOT_TOKEN);

// Fetch the OAuth token from Twitch
axios.post(`https://id.twitch.tv/oauth2/token?client_id=${twitchClientID}&client_secret=${twitchSecret}&grant_type=client_credentials`)
    .then(res => {
        twitchToken = res.data.access_token;
    });

// Function to send a live notification to Discord
function sendLiveNotification(streamTitle) {
    let channel = client.channels.cache.get(discordChannelID);
    if (channel) {
        channel.send(`@everyone ${twitchStreamer} is live now!\n\nStream Title: "${streamTitle}"\n\nGame: "${gameName}\nWatch here: https://www.twitch.tv/${twitchStreamer}`);
    }
}

// Check if the bot is connected to Twitch
app.get('/twitch', (req, res) => {
    if (twitchToken) {
        res.status(200).json({ connected: true });
    } else {
        res.status(500).json({ connected: false });
    }
});

// Check if the bot is connected to Discord
app.get('/discord', (req, res) => {
    if (client.readyAt) {
        res.status(200).json({ connected: true });
    } else {
        res.status(500).json({ connected: false });
    }
});

// Get the current live status
app.get('/status', (req, res) => {
    res.status(200).json({ isLive });
});

// Every minute, check if the stream is live
setInterval(() => {
    axios.get(`https://api.twitch.tv/helix/streams?user_login=${twitchStreamer}`, {
        headers: {
            'Client-ID': twitchClientID,
            'Authorization': `Bearer ${twitchToken}`
        }
    }).then(res => {
        if (res.data.data.length > 0) {
            // Stream is live
            if (!isLive) {
                // Stream just went live
                isLive = true;
                let streamTitle = res.data.data[0].title; // Extracting stream title from the response
                let gameName = res.data.data[0].game_name;
                sendLiveNotification(streamTitle)(gameName);
            }
        } else {
            // Stream is offline
            isLive = false;
        }
    });
}, 60000);

// Start the web server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
