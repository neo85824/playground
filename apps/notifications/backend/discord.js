require('dotenv').config();
const axios = require('axios');

async function send(title, message) {
  const content = title ? `**${title}**\n${message}` : message;

  await axios.post(
    `https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_ID}/messages`,
    { content },
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
  );
}

module.exports = { send };
