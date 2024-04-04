const preCheck = require('./pre-checks.js');
preCheck();
const config = require("../config/config.json");
const express = require('express');
const trelloManager = require('./trello.js');
const chalk = require('chalk');
const path = require('path');
const { writeToLogFile } = require('./logger.js');

const app = express();
const port = config.appPort;

// Disable x-powered-by header (hides that express is being used)
app.disable('x-powered-by');

// Middleware
app.use(express.urlencoded({ limit: '2000mb', extended: true })); // Parse URL-encoded bodies
app.use(express.json({ limit: '2000mb' }));

// Configure parsing body as JSON (we need this or body will be empty)
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  if (req.path === '/') {
    writeToLogFile(`Server Interaction - PAGE LOADED: ${req.method} ${req.path}`, 'info', 'host.js', 'logging-middleware');
    // log the user's device
    writeToLogFile(`User Device: ${req.headers['user-agent']}`, 'info', 'host.js', 'logging-middleware');
    next();
    return;
  }
  // if a static file is requested, don't log it (I don't want to see all the requests for images, css, etc.)
  if (req.path.includes('.')) {
    next();
    return;
  }
  writeToLogFile(`Server Interaction: ${req.method} ${req.path}`, 'info', 'host.js', 'logging-middleware');
  // log the user's device
  writeToLogFile(`User Device: ${req.headers['user-agent']}`, 'info', 'host.js', 'logging-middleware');
  next();
});

// Serve static files from the public directory
app.use('/', express.static(path.join(__dirname, '../public')));
app.use('/fta', express.static(path.join(__dirname, '../public')));

app.post(['/submit', '/fta/submit'], (req, res) => {
  // Create a new Trello card using the data received from frontend form
  console.log(chalk.green('Received card data:'));
  console.log({ ...req.body, attachments: req.body.attachments.length });
  writeToLogFile(`Received card data: ${JSON.stringify({ ...req.body, attachments: req.body.attachments.length })}`, 'info', 'host.js', '/submit', false);
  trelloManager.createCard(req.body.title, req.body.teamNumber, req.body.contactEmail, req.body.contactName, req.body.frcEvent, req.body.problemCategory, req.body.priority, req.body.description, req.body.attachments, req.path === '/fta/submit');
  res.status(200).send('Request received successfully!');
});

// Start the server
app.listen(port, async () => {
  await trelloManager.verifyLabels();
  //await trelloManager.deleteAllLabelsOnAllBoards();
  writeToLogFile(`Server is running on http://localhost:${port}`, 'info', 'host.js', 'app.listen');
});