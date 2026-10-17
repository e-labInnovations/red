// All app secrets/config live in .env and are loaded by settings.js via dotenv
module.exports = {
  apps: [
    {
      name: "Node-RED elabins Mod",
      cwd: __dirname,
      script: "node_modules/node-red/red.js", // Path to the Node-RED script
      args: ["--settings", "./settings.js"], // Arguments to pass to the script
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_file: "logs/combined.log",
      time: true,
    },
  ],
};
