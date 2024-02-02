const fs = require('fs');
const path = require('path');

// This file is loaded by the import at the top of the host.js file. This is responsible for ensuring we have a config file and making one if needed.
// Basically, a new docker volume won't have one, so we need to make it and then ask you to fill it in.

function checkIt() {
  // Let's see if a config.json file exists in the config directory. If not, create one.
  if (fs.existsSync(path.join(__dirname, '../config/config.json'))) {
    console.log("Config file found, verifying it..");
    // Make sure the at least contains the minimum required fields
    const config = require("../config/config.json");
    if (!config.trelloAppKey || !config.trelloUserToken || !config.trelloBoards || !config.trelloBoardLabels) {
      console.error("Invalid config file! Please make sure you have specified your Trello app key, user token, and at least one board (with trelloId) and label in the config file.\n" +
        "If this is your first time running this app, please see the README for instructions on how to get your keys and IDs and how to set the config file.\n");
      process.exit(1);
    } else {
      console.log("Config file looks good.");
    }
  } else {
    console.log("Config file not found. Creating a default one for you now.");
    fs.copyFileSync(path.join(__dirname, '../config/config.example.json'), path.join(__dirname, '../config-template.json'));
    console.log("Config file created. Please fill in the config file with your Trello app key, user token, and trello IDs of your boards.");
    console.log("Restart when filled in. Exiting now. See you soon!")
    process.exit(1);
  }
}

module.exports = function () {
  checkIt();
  console.log("Pre-checks complete.");
}