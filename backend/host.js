const preCheck = require('./pre-checks.js');
preCheck();
const express = require('express');
const trelloManager = require('./trello.js');
const path = require('path');

const app = express();
const port = 3000;

// Disable x-powered-by header (hides that express is being used)
app.disable('x-powered-by');

// Middleware
app.use(express.urlencoded({ limit: '200mb', extended: true })); // Parse URL-encoded bodies
app.use(express.json({ limit: '200mb' }));

// Configure parsing body as JSON (we need this or body will be empty)
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

app.post('/submit', (req, res) => {
  // Create a new Trello card using the data received from frontend form
  console.log('Received card data:');
  console.log({ ...req.body, attachments: req.body.attachments.length });
  trelloManager.createCard(req.body.title, req.body.teamNumber, req.body.contactEmail, req.body.contactName, req.body.frcEvent, req.body.problemCategory, req.body.priority, req.body.description, req.body.attachments);
  res.status(200).send('Request received successfully!');
});

// Start the server
app.listen(port, async () => {
  await trelloManager.verifyLabels();
  //await trelloManager.deleteAllLabelsOnAllBoards();
  console.log(`Server is running on http://localhost:${port}`);
});