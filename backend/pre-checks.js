const fs = require('fs');
const path = require('path');
const { writeToLogFile } = require('./logger.js');

// This file is loaded by the import at the top of the host.js file. This is responsible for ensuring we have a config file and making one if needed.
// Basically, a new docker volume won't have one, so we need to make it and then ask you to fill it in.

function checkIt() {
  // Let's see if a config.json file exists in the config directory. If not, create one.
  if (fs.existsSync(path.join(__dirname, '../config/config.json'))) {
    writeToLogFile(`Config file found, verifying it..`, 'info', 'pre-checks.js', 'checkIt')
    // Make sure the at least contains the minimum required fields
    let config = require(path.join(__dirname, "../config/config.json"));
    if (!config.trelloAppKey || !config.trelloUserToken || !config.trelloBoards || !config.trelloBoardLabels || !config.appPort || !Number.isInteger(config.appPort) || config.appPort < 1 || config.appPort > 65535) {
      if (!config.appPort || !Number.isInteger(config.appPort) || config.appPort < 1 || config.appPort > 65535) {
        config.appPort = 3000;
        fs.writeFileSync(path.join(__dirname, "../config/config.json"), JSON.stringify(config, null, 2));
        writeToLogFile(`No valid appPort found in config file. Set to default port (3000) and updated config file.`, 'warn', 'pre-checks.js', 'checkIt');
      } else {
        writeToLogFile(`Invalid config file! Please make sure you have specified your Trello app key, user token, and at least one board (with trelloId) and label in the config file. Also, make sure you have specified a valid port number (1-65535) for appPort.`, 'error', 'pre-checks.js', 'checkIt');
        writeToLogFile(`If this is your first time running this app, please see the README for instructions on how to get your keys and IDs and how to set the config file.`, 'error', 'pre-checks.js', 'checkIt');
        process.exit(1);
      }
    } else {
      writeToLogFile(`Config file looks good.`, 'info', 'pre-checks.js', 'checkIt');
    }
  } else {
    writeToLogFile(`Config file not found. Creating a default one for you now.`, 'warn', 'pre-checks.js', 'checkIt');
    fs.copyFileSync(path.join(__dirname, '../config-template.json'), path.join(__dirname, '../config/config.json'));
    writeToLogFile(`Config file created. Please fill in the config file with your Trello app key, user token, and trello IDs of your boards.`, 'warn', 'pre-checks.js', 'checkIt');
    writeToLogFile(`Restart when filled in. Exiting now.`, 'info', 'pre-checks.js', 'checkIt');
    process.exit(0);
  }
}

module.exports = function () {
  checkIt();
  writeToLogFile(`Pre-checks complete.`, 'info', 'pre-checks.js', 'checkIt');
}