// This file just contains the function for logging to file that is used within the backend code.
// This is so that I can keep track of usage and go back to find out what happened if something goes wrong or weird stuff is happening.

const fs = require('node:fs');
const path = require('node:path');
const pc = require('picocolors');
// async fs
const fsAsync = require('fs').promises;


const logFileLocation = path.join(__dirname, '..', 'config/backend.log');
const logHistoryDays = 90; // max age of log file entries to keep, older ones get trimmed to prevent the log file from growing indefinitely

// make the log file itself if it doesn't exist yet
ensureLogFileExists();


/**
 * Writes a formatted message to the log file and optionally to the console.
 *
 * @param {string} message - The message to write to the log file.
 * @param {string} type - The type of the message (e.g., 'info', 'warn', 'error').
 * @param {string} sourceFile - The name of the file where the log message originated.
 * @param {string} sourceFunction - The name of the function where the log message originated.
 * @param {boolean} [toConsoleAlso=true] - Whether to also output the message to the console.
 * @param {boolean} [newFile=false] - Whether this is a new file. If true, the message will not start with a newline character.
 *
 * The function formats the message with a timestamp, the message type, and the source file and function,
 * and then appends the formatted message to the log file. Each message is written on a new line.
 * If `toConsoleAlso` is true, the function also outputs the message to the console with appropriate coloring based on the message type.
 */
function writeToLogFile(message, type, sourceFile, sourceFunction, toConsoleAlso = true, newFile = false) {
  const date = new Date();
  const dateString = date.toLocaleDateString();
  const timeString = date.toLocaleTimeString();
  const formattedDate = `${dateString} ${timeString}`;

  // Pad the type and sourceFile to align the output columns (for readability and I'm a neat freak)
  const paddedType = (`<${type.toUpperCase()}>`).padEnd(7);
  const paddedFileAndFunction = (`(${sourceFile})[${sourceFunction}]`).padEnd(30);

  // Send to console as well (basically the same thing, just with picocolors coloring and no padding)
  if (toConsoleAlso) {
    switch (type) {
      case 'info':
        console.log(pc.green(`${formattedDate} <INFO> (${sourceFile})[${sourceFunction}] - ${pc.cyan(message)}`));
        break;
      case 'warn':
        console.log(pc.yellow(`${formattedDate} <WARN> (${sourceFile})[${sourceFunction}] - ${pc.cyan(message)}`));
        break;
      case 'error':
        console.log(pc.red(`${formattedDate} <ERROR> (${sourceFile})[${sourceFunction}] - ${pc.cyan(message)}`));
        break;
      default:
        console.log(pc.magenta(`${formattedDate} <UNKNOWN> (${sourceFile})[${sourceFunction}] - ${pc.cyan(message)}`));
    }
  }

  const formattedMessage = `${newFile ? '' : '\n'}${formattedDate} ${paddedType} ${paddedFileAndFunction} - ${message}`;
  fs.appendFileSync(logFileLocation, formattedMessage);
}


/**
 * Trims the log file of entries older than the configured days.
 *
 * This function reads the log file, splits it into an array of entries, and removes entries that are older than the configured days.
 * The function then writes the remaining entries back to the log file.
 * The function also calculates the size of the log file and logs the number of entries removed, the number of remaining entries, the date of the oldest entry, and the size of the log file.
 *
 * @returns {void} Nothing.
 */
function trimLogFile() {
  const logFile = fs.readFileSync(logFileLocation, 'utf8');
  const logFileArray = logFile.split('\n');
  const currentDate = new Date();
  const fiveDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - logHistoryDays));

  // Sanity check - if the first line is empty, remove it (messes with the date parsing and counts if it's there)
  if (logFileArray[0] === '') logFileArray.shift();

  const newLogFileArray = [];
  let trimmedEntriesCount = 0;

  logFileArray.forEach(logEntry => {
    // Extract the date and time part from the log entry
    const dateTimePart = logEntry.split(' ')[0] + ' ' + logEntry.split(' ')[1] + ' ' + logEntry.split(' ')[2];
    // Parse the date and time to a Date object
    const logEntryDate = parseDate(dateTimePart);

    if (logEntryDate < fiveDaysAgo) {
      //console.log(`Removing entry: ${logEntry}`);
      trimmedEntriesCount++;
    } else {
      newLogFileArray.push(logEntry);
    }
  });

  const newLogFile = newLogFileArray.join('\n');
  fs.writeFileSync(logFileLocation, newLogFile);
  const remainingEntriesCount = newLogFileArray.length;

  // Find the date of the oldest entry
  let oldestEntryDate = newLogFileArray[0].split(' ')[0];

  const stats = fs.statSync(logFileLocation);
  const fileSizeInBytes = stats.size;
  let fileSizeString;
  if (fileSizeInBytes > 1024 * 1024) {
    fileSizeString = `${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    fileSizeString = `${(fileSizeInBytes / 1024).toFixed(2)} KB`;
  }

  writeToLogFile(`Log file trim ran, ${trimmedEntriesCount} entries removed. Currently ${remainingEntriesCount} entries, oldest from ${oldestEntryDate}. File size ${fileSizeString}`, 'info', 'logger.js', 'trimLogFile');
}


/**
 * Parses a date string into a Date object.
 *
 * This function assumes the date string is in the 'M/D/YYYY h:mm:ss A' format, as the writer logs them.
 * The function splits the date string into its components, converts the hours to 24-hour format based on AM/PM, and creates a new Date object with these components.
 *
 * @param {string} dateString - The date string to parse.
 * @returns {Date} The Date object created from the date string.
 */
function parseDate(dateString) {
  // Assuming dateString is in 'M/D/YYYY h:mm:ss A' format as the writer logs them
  const [datePart, timePart, meridiem] = dateString.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');

  let hours24 = parseInt(hours, 10);
  // Convert hours to 24-hour format based on AM/PM
  if (meridiem === 'PM' && hours24 < 12) hours24 += 12;
  if (meridiem === 'AM' && hours24 === 12) hours24 = 0;

  return new Date(year, month - 1, day, hours24, minutes, seconds);
}


/**
 * Checks if the log file exists and creates it if it doesn't.
 *
 * This function uses the `fsAsync.access` method to check if the log file at `logFileLocation` exists.
 * If the file exists, it calls the `trimLogFile` function to trim the log file.
 * If the file doesn't exist, it calls the `writeToLogFile` function to create the file and make an initial entry.
 * If an error other than 'ENOENT' (which indicates that the file doesn't exist) occurs, it logs the error to the console.
 *
 * @async
 */
async function ensureLogFileExists() {
  try {
    await fsAsync.access(logFileLocation);
    // run a trim it once on this startup if the file exists
    trimLogFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create it and make an initial entry
      writeToLogFile('New log file created', 'info', 'logger.js', 'init', true, true);
    } else {
      // Some other error occurred
      console.error(`Error checking for log file: ${error}`);
    }
  }
}


// schedule the log file trimming to occur every 24 hours
setInterval(trimLogFile, 86400000);


// Export the function so it can be used in other files
module.exports = { writeToLogFile };
