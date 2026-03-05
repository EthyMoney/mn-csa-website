// This is where the backend logic to handle creating a new trello card will go. 
// We will use the Trello API to create a new card based on the info submitted in the form.

const path = require('path');
const { writeToLogFile } = require('./logger.js');

// Dynamic config getter - always returns fresh config (supports hot-reload from host.js)
function getConfig() {
  // Clear cache and re-require to get latest config
  const configPath = path.join(__dirname, '../config/config.json');
  delete require.cache[require.resolve(configPath)];
  return require(configPath);
}


/**
 * Keyword mappings for inferring problem category labels from message content.
 * Each key is a label name, and the value is an array of keywords/phrases to match.
 * Keywords are matched case-insensitively against the title and description.
 */
const labelKeywordMappings = {
  'CANBus fault': ['canbus', 'can bus', 'can-bus', 'can fault', 'can error', 'can id', 'canivore', 'phoenix', 'ctre'],
  'Code - C++': ['c++', 'cpp', 'wpilib c++', 'timedrobot'],
  'Code - Java': ['java', 'wpilib java', 'gradle', 'vendordeps', 'vendor deps', 'timedrobot'],
  'Code - LabView': ['labview', 'lab view', 'labview vi', 'national instruments', 'ni labview'],
  'Code - Python': ['python', 'robotpy', 'pyfrc', 'pip install', 'python3'],
  'Code - General': ['code', 'programming', 'compile', 'build error', 'deploy', 'deploying', 'wpilib', 'pathplanner', 'auto', 'autonomous', 'teleop', 'command', 'subsystem'],
  'Communication - Limelight': ['limelight', 'lime light', 'vision', 'apriltag', 'april tag', 'photonvision', 'camera', 'arducam'],
  'Configuration': ['configure', 'configuration', 'settings', 'tuning', 'pid', 'phoenix tuner', 'rev hardware client', 'spark max'],
  'Driver Station': ['driver station', 'driverstation', 'ds', 'fms', 'joystick', 'controller', 'xbox', 'gamepad', 'enable', 'disabled'],
  'Electronic - Brownout': ['brownout', 'brown out', 'voltage drop', 'low voltage', 'battery', 'pdp', 'pdh', 'power distribution'],
  'Electronic - Communication': ['ethernet', 'network', 'ip address', 'rio not connecting', 'cannot connect', 'connection', 'wifi', 'radio connection'],
  'Electronic - General': ['electronic', 'electrical', 'circuit', 'fuse', 'breaker', 'main breaker'],
  'Electronic - Pneumatics': ['pneumatic', 'solenoid', 'compressor', 'pcm', 'ph', 'pneumatic hub', 'air pressure', 'psi', 'cylinder'],
  'Electronic - Wiring': ['wiring', 'wire', 'connector', 'crimp', 'pwm', 'dio', 'analog', 'solder', 'loose connection'],
  'Electronic - Incompatible Components': ['incompatible', 'wrong voltage', 'not compatible', '12v', '5v', 'voltage mismatch'],
  'Field - Brownouts': ['field brownout', 'brownout on field', 'field power', 'lost power on field'],
  'Field - Communication': ['field communication', 'lost connection on field', 'disconnected on field', 'field connection', 'fms connection'],
  'Field - General': ['on field', 'during match', 'field fault', 'field issue'],
  'Field - roboRIO Reboot': ['roborio reboot', 'rio reboot', 'roborio restart', 'rio restart', 'roborio crash'],
  'Field - Radio Reboot': ['radio reboot', 'radio restart', 'radio crash', 'radio issue', 'om5p'],
  'Firmware update': ['firmware', 'update firmware', 'flash', 'image', 'roborio image', 'radio firmware', 'spark max firmware', 'talon firmware'],
  'Practice Field': ['practice field', 'practice', 'pit', 'practice area'],
  'Raspberry Pi': ['raspberry pi', 'raspberrypi', 'pi', 'coprocessor', 'rpi']
};


/**
 * Infers a problem category label from the title and description content.
 * Searches for keywords associated with each label category.
 *
 * @function inferLabelFromContent
 * @param {string} title - The title/summary of the issue.
 * @param {string} description - The detailed description of the issue.
 * @returns {string|null} The inferred label name, or null if no match is found.
 */
function inferLabelFromContent(title, description) {
  const config = getConfig();
  const availableLabels = config.trelloBoardLabels.map(label => label.name);
  const content = `${title || ''} ${description || ''}`.toLowerCase();

  // Track matches with scores (number of keyword matches per label)
  const labelScores = {};

  for (const [labelName, keywords] of Object.entries(labelKeywordMappings)) {
    // Only consider labels that exist in the config
    if (!availableLabels.some(label => label.toLowerCase() === labelName.toLowerCase())) {
      continue;
    }

    let score = 0;
    for (const keyword of keywords) {
      // Use word boundary matching for more accurate results
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(content)) {
        score++;
      }
    }
    if (score > 0) {
      labelScores[labelName] = score;
    }
  }

  // Find the label with the highest score
  let bestLabel = null;
  let highestScore = 0;
  for (const [labelName, score] of Object.entries(labelScores)) {
    if (score > highestScore) {
      highestScore = score;
      bestLabel = labelName;
    }
  }

  if (bestLabel) {
    writeToLogFile(`Inferred label "${bestLabel}" from content (score: ${highestScore})`, 'info', 'trello.js', 'inferLabelFromContent');
  }

  return bestLabel;
}

// Check to see if the config file is valid (this will catch a docker user that forgot to fill this in)
const initialConfig = getConfig();
if (!initialConfig.trelloAppKey || !initialConfig.trelloUserToken || !initialConfig.trelloBoards || !initialConfig.trelloBoardLabels) {
  writeToLogFile('Invalid config file! Please make sure you have specified your Trello app key, user token, and at least one board and label in the config file.', 'error', 'trello.js', 'configCheck');
  writeToLogFile('If this is your first time running this app, please see the README for instructions on how to get your Trello app key and user token. These need to go in the config/config.json file.', 'error', 'trello.js', 'configCheck');
  process.exit(1);
}

// Some terms to understand:
// trelloId: This is the ID of the board or element instance as you see it in your browser URL bar when viewing the board. This is NOT the same as the board ID!
//           A trelloId can also be used as the ID for other things too, like lists, cards, labels. For example, a label's ID is a trelloId. This is just what trello calls these, they don't relate to each other.
//           This is what is stored in the config file and is used to lookup the boardId and other info. It's shorter, looks something like this: CxCc1Ofe
// boardId: This is the ID of the board as it is stored in Trello's database. These are longer and look something like this: 6596f1d9f2b262c8cef42fe4
//          This is is needed to make creation calls to the API, whereas we use the trelloId to lookup a boardId and some other items too, like getting labels.


/**
 * Creates a new card on the incoming list for the specified board based on event.
 *
 * @async
 * @function createCard
 * @param {string} title - The title of the card.
 * @param {number} teamNumber - The team number.
 * @param {string} contactEmail - The contact email.
 * @param {string} contactName - The contact name.
 * @param {string} frcEvent - The FRC event.
 * @param {string} problemCategory - The problem category.
 * @param {string} priority - The priority.
 * @param {string} description - The description.
 * @param {Array} attachments - The attachments.
 * @param {boolean} [ftaSubmission=false] - Indicates whether the card is a FTA submission.
 * @returns {Promise<void>} Promise object represents the result of the fetch operation.
 * @throws Will throw an error if the fetch operation fails.
 */
async function createCard(title, teamNumber, contactEmail, contactName, frcEvent, problemCategory, priority, description, attachments, ftaSubmission = false, nexusSubmission = false) {
  const config = getConfig();
  const trelloBoards = config.trelloBoards;

  // find the id of the board we want to create the card on according to the selected event
  let trelloId;
  try {
    trelloId = trelloBoards.find(board => board.frontendEventSelection.toLowerCase() === frcEvent.toLowerCase()).trelloId;
  } catch {
    writeToLogFile(`Error finding trelloId for board with event "${frcEvent}"`, 'error', 'trello.js', 'createCard');
    throw new Error(`Error finding trelloId for board with event "${frcEvent}". Did you provide a valid event?`);
  }
  // find the id of the "incoming" list on the board so we can create the card there
  const listId = await getIncomingListIdOfBoard(trelloId);

  // determine submission type and format description accordingly
  let formattedDescription;
  const submissionType = ftaSubmission ? 'fta' : nexusSubmission ? 'nexus' : 'team';

  switch (submissionType) {
    case 'fta':
      formattedDescription = `**THIS IS AN AUTOMATICALLY CREATED CARD FROM A FTA WEB SUBMISSION**\n\n**Team Number:** ${teamNumber}\n\n**Additional Details:** ${description || 'none provided'}`;
      break;
    case 'nexus':
      formattedDescription = `**THIS IS AN AUTOMATICALLY CREATED CARD FROM A NEXUS WEB SUBMISSION**\n\n**Team Number:** ${teamNumber}\n\n**Additional Details:** ${description || 'none provided'}`;
      break;
    default:
      formattedDescription = `**THIS IS AN AUTOMATICALLY CREATED CARD FROM A TEAM WEB SUBMISSION**\n\n**Team Number:** ${teamNumber}\n\n**Contact Email:** ${contactEmail}\n\n**Contact Name:** ${contactName}\n\n**Description:** ${description}`;
  }

  // If problemCategory is 'Other or not sure', attempt to infer a better label from the content
  let effectiveProblemCategory = problemCategory;
  if (problemCategory?.toLowerCase() === 'other or not sure') {
    const inferredLabel = inferLabelFromContent(title, description);
    if (inferredLabel) {
      writeToLogFile(`Problem category was "Other or not sure", inferred "${inferredLabel}" from content`, 'info', 'trello.js', 'createCard');
      effectiveProblemCategory = inferredLabel;
    } else {
      writeToLogFile('Problem category was "Other or not sure" and no label could be inferred from content', 'info', 'trello.js', 'createCard');
    }
  }

  // lookup the IDs of the labels we want to add to the card based on the selected category and priority
  const problemCategoryLabelId = await getLabelIdByName(trelloId, effectiveProblemCategory);
  const priorityLabelId = await getLabelIdByName(trelloId, priority);
  const ftaLabelId = await getLabelIdByName(trelloId, 'FTA SUBMITTED');
  const nexusLabelId = await getLabelIdByName(trelloId, 'NEXUS SUBMITTED');
  let labelIds = [];

  // conditionally push problemCategoryLabelId and priorityLabelId and if they exist (might not since they are optional fields on the form for FTA submissions)
  if (problemCategoryLabelId) {
    labelIds.push(problemCategoryLabelId);
  }
  if (priorityLabelId) {
    labelIds.push(priorityLabelId);
  }

  // if this is a FTA submission, add the FTA label
  if (ftaSubmission && ftaLabelId) {
    labelIds.push(ftaLabelId);
  }

  // if this is a NEXUS submission, add the NEXUS label
  if (nexusSubmission && nexusLabelId) {
    labelIds.push(nexusLabelId);
  }

  // send the request to create the new card, it will be created at the top of the "incoming" list
  const res = await fetch(`https://api.trello.com/1/cards?key=${config.trelloAppKey}&token=${config.trelloUserToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idList: listId,
      name: teamNumber + ': ' + title,
      desc: formattedDescription,
      pos: 'top',
      start: new Date(),
      idLabels: labelIds
    })
  });

  if (res.ok) {
    writeToLogFile('Card created successfully', 'info', 'trello.js', 'createCard');

    // if we have attachments, add them to the card
    if (attachments.length > 0) {
      writeToLogFile('Adding attachments to card', 'info', 'trello.js', 'createCard');
      const card = await res.json();
      for (const attachment of attachments) {
        try {
          const buffer = Buffer.from(attachment.data, 'base64');
          const blob = new Blob([buffer]);
          const formData = new FormData();
          formData.append('key', config.trelloAppKey);
          formData.append('token', config.trelloUserToken);
          formData.append('file', blob, attachment.name);

          const attachmentRes = await fetch(`https://api.trello.com/1/cards/${card.id}/attachments`, {
            method: 'POST',
            body: formData
          });

          if (!attachmentRes.ok) {
            writeToLogFile(`Error adding attachment ${attachment.name} to card ${card.id} ---> ${attachmentRes.status}: ${attachmentRes.statusText}`, 'error', 'trello.js', 'createCard');
          }
          else {
            writeToLogFile(`Attachment ${attachment.name} added successfully`, 'info', 'trello.js', 'createCard');
          }
        } catch (error) {
          writeToLogFile(`Error processing attachment ${attachment.name}: ${error.message}`, 'error', 'trello.js', 'createCard');
        }
      }
      writeToLogFile('All attachments processed', 'info', 'trello.js', 'createCard');
    }
  }
  else {
    writeToLogFile(`Error creating card on board ${trelloId} ---> ${res.status}: ${res.statusText}`, 'error', 'trello.js', 'createCard');
    try {
      const errorResponse = await res.json();
      writeToLogFile(`Error Details: ${JSON.stringify(errorResponse)}`, 'error', 'trello.js', 'createCard');
    } catch (error) {
      writeToLogFile(`Error parsing create label response: ${error.message}`, 'error', 'trello.js', 'createCard');
    }
  }
}



/**
 * Verifies that the configured labels exist on all configured boards. 
 * If a label does not exist on a board, the function creates it.
 *
 * @async
 * @function verifyLabels
 * @returns {Promise<void>} Promise object represents the completion of label verification and creation.
 * @throws Will throw an error if the fetch operation fails.
 */
async function verifyLabels() {
  const config = getConfig();
  const trelloBoards = config.trelloBoards;
  const trelloLabels = config.trelloBoardLabels;

  for (const board of trelloBoards) {
    const trelloId = board.trelloId;
    const boardId = await getBoardIdByTrelloId(trelloId);
    // grab the labels currently present on the board, if any
    const res = await fetch(`https://api.trello.com/1/boards/${trelloId}/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
    if (res.ok) {
      const resJson = await res.json();
      writeToLogFile(`Found ${resJson.length} labels on board ${trelloId}`, 'info', 'trello.js', 'verifyLabels');
      // iterate through each label in our local config
      for (const expectedLabel of trelloLabels) {
        // if we don't see our label on the board, create it
        if (!resJson.find(boardLabel => boardLabel.name.toLowerCase() === expectedLabel.name.toLowerCase())) {
          const res = await fetch(`https://api.trello.com/1/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}&name=${encodeURIComponent(expectedLabel.name)}&color=${expectedLabel.color}&idBoard=${boardId}`, {
            method: 'POST'
          });
          if (res.ok) {
            writeToLogFile(`Created label ${expectedLabel.name} on board ${trelloId}`, 'info', 'trello.js', 'verifyLabels');
          }
          else {
            writeToLogFile(`Error creating label ${expectedLabel.name} on board ${trelloId} ---> ${res.status}: ${res.statusText}`, 'error', 'trello.js', 'verifyLabels');
          }
        }
      }
    }
    else {
      writeToLogFile(`Error getting labels on board ${trelloId}`, 'error', 'trello.js', 'verifyLabels');
    }
  }
}



/**
 * Looks up and returns the list ID of the "incoming" list on the specified board.
 *
 * @async
 * @function getIncomingListIdOfBoard
 * @param {string} trelloId - The ID of the Trello board.
 * @returns {Promise<string>} Promise object represents the ID of the "incoming" list on the specified board.
 * @throws Will throw an error if the fetch operation fails.
 */
async function getIncomingListIdOfBoard(trelloId) {
  const config = getConfig();
  const res = await fetch(`https://api.trello.com/1/boards/${trelloId}/lists?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    return resJson.find(list => list.name.toLowerCase() === 'incoming').id;
  }
  else {
    return;
  }
}



/**
 * Looks up and returns the ID of the label with the specified name on the specified board.
 *
 * @async
 * @function getLabelIdByName
 * @param {string} trelloId - The ID of the Trello board.
 * @param {string} labelName - The name of the label.
 * @returns {Promise<string|null>} Promise object represents the ID of the label, or null if the label does not exist or the fetch operation fails.
 * @throws Will throw an error if the fetch operation fails.
 */
async function getLabelIdByName(trelloId, labelName) {
  const config = getConfig();
  const res = await fetch(`https://api.trello.com/1/boards/${trelloId}/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    const label = resJson.find(label => label.name?.toLowerCase() === labelName?.toLowerCase());
    if (label) {
      return label.id;
    }
    else {
      return;
    }
  }
  else {
    return;
  }
}



/**
 * Looks up and returns the ID of the board with the specified Trello ID.
 *
 * @async
 * @function getBoardIdByTrelloId
 * @param {string} trelloId - The Trello ID of the board.
 * @returns {Promise<string|undefined>} Promise object represents the ID of the board, or undefined if the fetch operation fails.
 * @throws Will throw an error if the fetch operation fails.
 */
async function getBoardIdByTrelloId(trelloId) {
  const config = getConfig();
  const res = await fetch(`https://api.trello.com/1/boards/${trelloId}?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    return resJson.id;
  }
  else {
    return;
  }
}



/**
 * Deletes all labels on the specified board. Be careful when using this function as it will also delete custom labels.
 *
 * @async
 * @function deleteAllLabelsOnBoard
 * @param {string} trelloId - The ID of the Trello board.
 * @returns {Promise<void>} Promise object represents the completion of the delete operation.
 * @throws Will throw an error if the fetch operation fails.
 */
async function deleteAllLabelsOnBoard(trelloId) {
  const config = getConfig();
  const res = await fetch(`https://api.trello.com/1/boards/${trelloId}/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    for (const label of resJson) {
      const res = await fetch(`https://api.trello.com/1/labels/${label.id}?key=${config.trelloAppKey}&token=${config.trelloUserToken}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        writeToLogFile(`Deleted label ${label.name} on board ${trelloId}`, 'info', 'trello.js', 'deleteAllLabelsOnBoard');
      }
      else {
        writeToLogFile(`Error deleting label ${label.name} on board ${trelloId} ---> ${res.status}: ${res.statusText}`, 'error', 'trello.js', 'deleteAllLabelsOnBoard');
      }
    }
  }
  else {
    writeToLogFile(`Error getting labels on board ${trelloId}`, 'error', 'trello.js', 'deleteAllLabelsOnBoard');
  }
}



/**
 * Deletes all labels on all configured boards. Use this function with caution as it will also delete custom labels.
 *
 * @async
 * @function deleteAllLabelsOnAllBoards
 * @returns {Promise<void>} Promise object represents the completion of the delete operation.
 * @throws Will throw an error if the fetch operation fails.
 */
async function deleteAllLabelsOnAllBoards() {
  const config = getConfig();
  const trelloBoards = config.trelloBoards;

  for (const board of trelloBoards) {
    const trelloId = board.trelloId;
    await deleteAllLabelsOnBoard(trelloId);
  }
}


module.exports = { createCard, verifyLabels, deleteAllLabelsOnBoard, deleteAllLabelsOnAllBoards };
