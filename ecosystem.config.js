require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "Node-RED elabins Mod",
      script: "node_modules/node-red/red.js", // Path to the Node-RED script
      args: ["--settings", "./settings.js"], // Arguments to pass to the script
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PATH: process.env.PATH || "/www/server/nodejs/v22.14.0/bin:$PATH",
        NODE_RED_USERNAME: process.env.NODE_RED_USERNAME,
        NODE_RED_PASSWORD: process.env.NODE_RED_PASSWORD,
        PORT: process.env.PORT,
        GoogleGenAI_API_KEY: process.env.GoogleGenAI_API_KEY,
        BOT_TOKEN: process.env.BOT_TOKEN,
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_file: "logs/combined.log",
      time: true,
    },
  ],
};
