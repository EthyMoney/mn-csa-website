const fs = require('fs');
const path = require('path');
const { writeToLogFile } = require('./logger.js');

// This file is loaded by the import at the top of the host.js file. This is responsible for ensuring we have a config file and making one if needed.
// Basically, a new docker volume won't have one, so we need to make it and then ask you to fill it in.

// Helper function to validate each board entry has all required properties
function validateBoardEntries(boards, caller) {
  const errors = [];
  if (!Array.isArray(boards)) {
    return ['trelloBoards must be an array'];
  }

  boards.forEach((board, index) => {
    const boardName = board.frontendEventSelection || `Board at index ${index}`;

    if (!board.frontendEventSelection || typeof board.frontendEventSelection !== 'string') {
      errors.push(`${boardName}: missing or invalid 'frontendEventSelection' (must be a non-empty string)`);
    }
    if (!board.trelloId || typeof board.trelloId !== 'string') {
      errors.push(`${boardName}: missing or invalid 'trelloId' (must be a non-empty string)`);
    }
    if (typeof board.enabled !== 'boolean') {
      // This one can be auto-fixed, so just note it but don't add to errors
      writeToLogFile(`${boardName}: missing 'enabled' property, will be set to false.`, 'warn', 'pre-checks.js', caller);
    }
  });

  return errors;
}

function checkIt() {
  // Let's see if a config.json file exists in the config directory. If not, create one.
  if (fs.existsSync(path.join(__dirname, '../config/config.json'))) {
    writeToLogFile('Config file found, verifying it..', 'info', 'pre-checks.js', 'checkIt');
    // Make sure the at least contains the minimum required fields
    let config = require(path.join(__dirname, '../config/config.json'));
    let configModified = false;

    // Check and fix appPort if invalid
    if (!config.appPort || !Number.isInteger(config.appPort) || config.appPort < 1 || config.appPort > 65535) {
      config.appPort = 3000;
      configModified = true;
      writeToLogFile('No valid appPort found in config file. Set to default port (3000).', 'warn', 'pre-checks.js', 'checkIt');
    }

    // Check and fix defaultEvent if missing
    if (!config.defaultEvent || typeof config.defaultEvent !== 'string') {
      const firstEnabledEvent = config.trelloBoards?.find(board => board.enabled)?.frontendEventSelection || 'Off Season';
      config.defaultEvent = firstEnabledEvent;
      configModified = true;
      writeToLogFile(`No valid defaultEvent found in config file. Set to "${firstEnabledEvent}".`, 'warn', 'pre-checks.js', 'checkIt');
    }

    // Check and fix trelloBoards entries - ensure each has an 'enabled' property
    if (config.trelloBoards && Array.isArray(config.trelloBoards)) {
      config.trelloBoards.forEach((board, index) => {
        if (typeof board.enabled !== 'boolean') {
          config.trelloBoards[index].enabled = false;
          configModified = true;
          writeToLogFile(`Board "${board.frontendEventSelection}" missing 'enabled' property. Set to false.`, 'warn', 'pre-checks.js', 'checkIt');
        }
      });
    }

    // Save config if any modifications were made
    if (configModified) {
      fs.writeFileSync(path.join(__dirname, '../config/config.json'), JSON.stringify(config, null, 2));
      writeToLogFile('Config file updated with missing/invalid fields.', 'warn', 'pre-checks.js', 'checkIt');
    }

    // Check for required fields that cannot be auto-fixed
    if (!config.trelloAppKey || !config.trelloUserToken || !config.trelloBoards || !config.trelloBoardLabels) {
      writeToLogFile('Invalid config file! Please make sure you have specified your Trello app key, user token, and at least one board (with trelloId) and label in the config file.', 'error', 'pre-checks.js', 'checkIt');
      writeToLogFile('If this is your first time running this app, please see the README for instructions on how to get your keys and IDs and how to set the config file.', 'error', 'pre-checks.js', 'checkIt');
      process.exit(1);
    }

    // Validate each board entry has all required properties
    const boardErrors = validateBoardEntries(config.trelloBoards, 'checkIt');
    if (boardErrors.length > 0) {
      writeToLogFile('Invalid trelloBoards configuration! Each board must have frontendEventSelection and trelloId:', 'error', 'pre-checks.js', 'checkIt');
      boardErrors.forEach(err => writeToLogFile(`  - ${err}`, 'error', 'pre-checks.js', 'checkIt'));
      process.exit(1);
    }

    // Verify at least one event is enabled
    const enabledEvents = config.trelloBoards.filter(board => board.enabled);
    if (enabledEvents.length === 0) {
      writeToLogFile('Warning: No events are enabled in the config. Users will not be able to submit requests until at least one event has "enabled": true.', 'warn', 'pre-checks.js', 'checkIt');
    }

    // Verify defaultEvent exists as an enabled event option
    const allEventNames = config.trelloBoards.map(board => board.frontendEventSelection);
    const enabledEventNames = enabledEvents.map(board => board.frontendEventSelection);
    if (!allEventNames.includes(config.defaultEvent)) {
      // defaultEvent doesn't exist at all - pick the first enabled event or first event
      const newDefault = enabledEventNames[0] || allEventNames[0] || 'Off Season';
      writeToLogFile(`defaultEvent "${config.defaultEvent}" does not exist in trelloBoards. Changed to "${newDefault}".`, 'warn', 'pre-checks.js', 'checkIt');
      config.defaultEvent = newDefault;
      fs.writeFileSync(path.join(__dirname, '../config/config.json'), JSON.stringify(config, null, 2));
    } else if (!enabledEventNames.includes(config.defaultEvent)) {
      // defaultEvent exists but is not enabled - warn but don't auto-fix (user may want this during setup)
      writeToLogFile(`Warning: defaultEvent "${config.defaultEvent}" is not enabled. Users will see it selected but it won't work for submissions.`, 'warn', 'pre-checks.js', 'checkIt');
    }

    writeToLogFile('Config file looks good.', 'info', 'pre-checks.js', 'checkIt');
  } else {
    writeToLogFile('Config file not found. Creating a default one for you now.', 'warn', 'pre-checks.js', 'checkIt');
    fs.copyFileSync(path.join(__dirname, '../config-template.json'), path.join(__dirname, '../config/config.json'));
    writeToLogFile('Config file created. Please fill in the config file with your Trello app key, user token, and trello IDs of your boards.', 'warn', 'pre-checks.js', 'checkIt');
    writeToLogFile('Restart when filled in. Exiting now.', 'info', 'pre-checks.js', 'checkIt');
    process.exit(0);
  }
}

module.exports = function () {
  checkIt();
  writeToLogFile('Pre-checks complete.', 'info', 'pre-checks.js', 'checkIt');
};

// Export validateConfig for hot-reload use (doesn't exit on errors, returns success/failure)
module.exports.validateConfig = function () {
  try {
    // Clear require cache to get fresh config
    const configPath = path.join(__dirname, '../config/config.json');
    delete require.cache[require.resolve(configPath)];

    if (!fs.existsSync(configPath)) {
      writeToLogFile('Config file not found during reload validation.', 'error', 'pre-checks.js', 'validateConfig');
      return false;
    }

    let config = require(configPath);
    let configModified = false;

    // Check and fix appPort if invalid
    if (!config.appPort || !Number.isInteger(config.appPort) || config.appPort < 1 || config.appPort > 65535) {
      config.appPort = 3000;
      configModified = true;
      writeToLogFile('No valid appPort found in config file. Set to default port (3000).', 'warn', 'pre-checks.js', 'validateConfig');
    }

    // Check and fix defaultEvent if missing
    if (!config.defaultEvent || typeof config.defaultEvent !== 'string') {
      const firstEnabledEvent = config.trelloBoards?.find(board => board.enabled)?.frontendEventSelection || 'Off Season';
      config.defaultEvent = firstEnabledEvent;
      configModified = true;
      writeToLogFile(`No valid defaultEvent found in config file. Set to "${firstEnabledEvent}".`, 'warn', 'pre-checks.js', 'validateConfig');
    }

    // Check and fix trelloBoards entries - ensure each has an 'enabled' property
    if (config.trelloBoards && Array.isArray(config.trelloBoards)) {
      config.trelloBoards.forEach((board, index) => {
        if (typeof board.enabled !== 'boolean') {
          config.trelloBoards[index].enabled = false;
          configModified = true;
          writeToLogFile(`Board "${board.frontendEventSelection}" missing 'enabled' property. Set to false.`, 'warn', 'pre-checks.js', 'validateConfig');
        }
      });
    }

    // Save config if any modifications were made
    if (configModified) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      writeToLogFile('Config file updated with missing/invalid fields.', 'warn', 'pre-checks.js', 'validateConfig');
    }

    // Check for required fields - return false instead of exiting
    if (!config.trelloAppKey || !config.trelloUserToken || !config.trelloBoards || !config.trelloBoardLabels) {
      writeToLogFile('Invalid config file! Missing required fields (trelloAppKey, trelloUserToken, trelloBoards, or trelloBoardLabels).', 'error', 'pre-checks.js', 'validateConfig');
      return false;
    }

    // Validate each board entry has all required properties
    const boardErrors = validateBoardEntries(config.trelloBoards, 'validateConfig');
    if (boardErrors.length > 0) {
      writeToLogFile('Invalid trelloBoards configuration! Each board must have frontendEventSelection and trelloId:', 'error', 'pre-checks.js', 'validateConfig');
      boardErrors.forEach(err => writeToLogFile(`  - ${err}`, 'error', 'pre-checks.js', 'validateConfig'));
      return false;
    }

    // Verify at least one event is enabled
    const enabledEvents = config.trelloBoards.filter(board => board.enabled);
    if (enabledEvents.length === 0) {
      writeToLogFile('Warning: No events are enabled in the config. Users will not be able to submit requests until at least one event has "enabled": true.', 'warn', 'pre-checks.js', 'validateConfig');
    }

    // Verify defaultEvent exists as an enabled event option
    const allEventNames = config.trelloBoards.map(board => board.frontendEventSelection);
    const enabledEventNames = enabledEvents.map(board => board.frontendEventSelection);
    if (!allEventNames.includes(config.defaultEvent)) {
      const newDefault = enabledEventNames[0] || allEventNames[0] || 'Off Season';
      writeToLogFile(`defaultEvent "${config.defaultEvent}" does not exist in trelloBoards. Changed to "${newDefault}".`, 'warn', 'pre-checks.js', 'validateConfig');
      config.defaultEvent = newDefault;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } else if (!enabledEventNames.includes(config.defaultEvent)) {
      writeToLogFile(`Warning: defaultEvent "${config.defaultEvent}" is not enabled. Users will see it selected but it won't work for submissions.`, 'warn', 'pre-checks.js', 'validateConfig');
    }

    writeToLogFile('Config validation passed.', 'info', 'pre-checks.js', 'validateConfig');
    return true;
  } catch (err) {
    writeToLogFile(`Config validation failed: ${err.message}`, 'error', 'pre-checks.js', 'validateConfig');
    return false;
  }
};