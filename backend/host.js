const preCheck = require('./pre-checks.js');
preCheck();
const config = require('../config/config.json');
const express = require('express');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const trelloManager = require('./trello.js');
const chalk = require('chalk');
const path = require('path');
const packageJson = require('../package.json');
const { writeToLogFile } = require('./logger.js');

const app = express();
const port = config.appPort;

// Disable x-powered-by header (hides that express is being used)
app.disable('x-powered-by');

// Use helmet to secure the app by setting various HTTP headers
app.use(helmet());

// Log the raw request body
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    if (data) {
      console.log('Raw incoming request body:', data);
    }
  });
  next();
});

// Middleware
app.use(express.urlencoded({ limit: '2000mb', extended: true })); // Parse URL-encoded bodies
app.use(express.json({ limit: '2000mb' })); // Configure parsing body as JSON (we need this or body will be empty)

// JSON parsing error handling middleware
app.use(function (err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(err);
    res.status(400).send({ message: 'Invalid JSON syntax in request body.' });
  } else {
    next();
  }
});

// Configure CORS to only allow requests from the frontend website (used for frontend form submission, API is key protected)
const corsOptions = {
  origin: 'https://support.mnfrccsa.com',
  optionsSuccessStatus: 200
};

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

const apiKeyMiddleware = (req, res, next) => {
  const userApiKey = req.header('API-Key');
  if (userApiKey === config.apiKey) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// Endpoint for submitting a Trello card (CORS protected, only allows requests from the frontend interface)
app.post(['/submit', '/fta/submit'], cors(corsOptions), [
  body('title').trim().isLength({ min: 1 }).withMessage('Title must not be empty'),
  body('teamNumber').isNumeric().withMessage('Team number must be a number'),
  body('contactEmail').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('contactName').trim().isLength({ min: 1 }).withMessage('Contact name must not be empty'),
  body('frcEvent').trim().isLength({ min: 1 }).withMessage('Event must not be empty'),
  body('problemCategory').optional().trim().isLength({ min: 1 }).withMessage('Problem category must not be empty'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description must not be empty'),
  body('priority').notEmpty().withMessage('Priority must be selected'),
  body('attachments.*.name').optional().isString().withMessage('Attachment names must be strings'),
  body('attachments.*.data').optional().isString().withMessage('Attachment data must be a base64 string'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  console.log(chalk.green('Received card data:'));
  console.log({ ...req.body, attachments: req.body.attachments.length });
  writeToLogFile(`Received card data: ${JSON.stringify({ ...req.body, attachments: req.body.attachments.length })}`, 'info', 'host.js', '/submit', false);
  trelloManager.createCard(req.body.title, req.body.teamNumber, req.body.contactEmail, req.body.contactName, req.body.frcEvent, req.body.problemCategory, req.body.priority, req.body.description, req.body.attachments, req.path === '/fta/submit').then(() => {
    res.status(200).send('Request received successfully!');
  }).catch((err) => {
    console.error(err);
    res.status(500).send('An error occurred while processing the request. Details: ' + err.message);
  });
});


// External API endpoint for creating a Trello card (key protected, no CORS required)
app.post(['/api/create', '/fta/api/create'], apiKeyMiddleware, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title must not be empty'),
  body('teamNumber').isNumeric().withMessage('Team number must be a number'),
  body('frcEvent').trim().isLength({ min: 1 }).withMessage('Event must not be empty'),
  body('problemCategory').optional().trim().isLength({ min: 1 }).withMessage('Problem category must not be empty').escape(),
  body('description').optional().trim().escape(),  // Description is optional and can be empty
  body('priority').optional().trim().isLength({ min: 1 }).withMessage('Priority must not be empty').escape(),
  body('attachments.*.name').optional().isString().withMessage('Attachment names must be strings'),
  body('attachments.*.data').optional().isString().withMessage('Attachment data must be a base64 string'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  console.log(chalk.green('API Key validated, received card data:'));
  console.log({ ...req.body, attachments: req.body.attachments.length });
  writeToLogFile(`API Card Data: ${JSON.stringify({ ...req.body, attachments: req.body.attachments.length })}`, 'info', 'host.js', '/api/create', false);
  trelloManager.createCard(req.body.title, req.body.teamNumber, '', 'FTA', req.body.frcEvent, req.body.problemCategory, req.body.priority, req.body.description, req.body.attachments, true).then(() => {
    res.status(200).send('API Request received successfully!');
  }).catch((err) => {
    console.error(err);
    res.status(500).send('An error occurred while processing the request. Details: ' + err.message);
  });
});


// Endpoint for getting the app version from package.json
app.get('/version', (req, res) => {
  res.status(200).json({ version: packageJson.version });
});


// Start the server
app.listen(port, async () => {
  await trelloManager.verifyLabels();
  //await trelloManager.deleteAllLabelsOnAllBoards();
  writeToLogFile(`Server is running on http://localhost:${port}`, 'info', 'host.js', 'app.listen');
});