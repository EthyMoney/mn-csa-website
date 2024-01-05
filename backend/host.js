const express = require('express');
const trelloManager = require('./trello.js');

const app = express();
const port = 3000;

// Disable x-powered-by header (hides that express is being used)
app.disable('x-powered-by');

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Configure parsing body as JSON (we need this or body will be empty)
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// favicon.ico route
// This route is required for the favicon in the browser tab
app.get('/favicon.ico', (req, res) => {
  res.sendFile(__dirname + '/public/favicon.ico');
});

app.post('/submit', (req, res) => {
  // Handle form submission and Trello card creation logic here
  // Retrieve form data from req.body
  // Create a new Trello card using the data
  // Send a response to the client
  console.log("submit was called");
  console.log(req.body);
});

// Start the server
app.listen(port, async () => {
  await trelloManager.verifyLabels();
  console.log(`Server is running on http://localhost:${port}`);
});