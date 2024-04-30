const preCheck = require('./pre-checks.js');
preCheck();
const trelloManager = require('./trello.js');
const { writeToLogFile } = require('./logger.js');
const readline = require('node:readline');
const chalk = require('chalk');

// This will call the function to delete ALL (ones you made yourself too!) labels on ALL configured boards
// This is a destructive action and should only be used if you want to start fresh with no labels and let the app create the needed ones again

// Prompt the user to confirm they want to delete all labels
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Wait a moment to allow the logging module to initialize and finish its trim operation
setTimeout(() => {
  writeToLogFile('Prompting user to confirm deletion of all labels on all boards', 'info', 'nuke-labels.js', 'rl-prompt');
  rl.question(chalk.yellow('\n\nAre you sure you want to delete all labels on all boards?\nThis is a destructive action and will remove all labels, including any you have created yourself.\n(yes/no): '), async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      await trelloManager.deleteAllLabelsOnAllBoards();
      writeToLogFile('All labels on all boards have been deleted.', 'info', 'nuke-labels.js', 'rl-prompt');
    } else {
      writeToLogFile('User chose not to delete all labels on all boards.', 'info', 'nuke-labels.js', 'rl-prompt');
    }
    rl.close();
    writeToLogFile('End of action, exiting now.', 'info', 'nuke-labels.js', 'rl-prompt');
    process.exit(0);
  });
}, 2000);
