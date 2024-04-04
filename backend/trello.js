// This is where the backend logic to handle creating a new trello card will go. 
// We will use the Trello API to create a new card based on the info submitted in the form.

const config = require("../config/config.json");
const fetch = require('node-fetch');
const FormData = require('form-data');
const { writeToLogFile } = require('./logger.js');
const trelloBoards = config.trelloBoards;
const trelloLabels = config.trelloBoardLabels;

// Check to see if the config file is valid (this will catch a docker user that forgot to fill this in)
if (!config.trelloAppKey || !config.trelloUserToken || !config.trelloBoards || !config.trelloBoardLabels) {
  writeToLogFile(`Invalid config file! Please make sure you have specified your Trello app key, user token, and at least one board and label in the config file.`, 'error', 'trello.js', 'configCheck');
  writeToLogFile(`If this is your first time running this app, please see the README for instructions on how to get your Trello app key and user token. These need to go in the config/config.json file.`, 'error', 'trello.js', 'configCheck');
  process.exit(1);
}

// Some terms to understand:
// trelloId: This is the ID of the board or element instance as you see it in your browser URL bar when viewing the board. This is NOT the same as the board ID!
//           A trelloId can also be used as the ID for other things too, like lists, cards, labels. For example, a label's ID is a trelloId. This is just what trello calls these, they don't relate to each other.
//           This is what is stored in the config file and is used to lookup the boardId and other info. It's shorter, looks something like this: CxCc1Ofe
// boardId: This is the ID of the board as it is stored in Trello's database. These are longer and look something like this: 6596f1d9f2b262c8cef42fe4
//          This is is needed to make creation calls to the API, whereas we use the trelloId to lookup a boardId and some other items too, like getting labels.


// create a new card on the incoming list for the specified board based on event
async function createCard(title, teamNumber, contactEmail, contactName, frcEvent, problemCategory, priority, description, attachments) {
  // find the id of the board we want to create the card on according to the selected event
  const trelloId = trelloBoards.find(board => board.frontendEventSelection.toLowerCase() === frcEvent.toLowerCase()).trelloId;
  // find the id of the "incoming" list on the board so we can create the card there
  const listId = await getIncomingListIdOfBoard(trelloId);
  const formattedDescription = `**THIS IS AN AUTOMATICALLY CREATED CARD FROM A WEB SUBMISSION**\n\n**Team Number:** ${teamNumber}\n\n**Contact Email:** ${contactEmail}\n\n**Contact Name:** ${contactName}\n\n**Description:** ${description}`;
  // lookup the IDs of the labels we want to add to the card based on the selected category and priority
  const problemCategoryLabelId = await getLabelIdByName(trelloId, problemCategory);
  const priorityLabelId = await getLabelIdByName(trelloId, priority);

  // send the request to create the new card, it will be created at the top of the "incoming" list
  const res = await fetch(`https://api.trello.com/1/cards?key=${config.trelloAppKey}&token=${config.trelloUserToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idList: listId,
      name: teamNumber + ": " + title,
      desc: formattedDescription,
      pos: 'top',
      start: new Date(),
      idLabels: [problemCategoryLabelId, priorityLabelId]
    })
  });

  if (res.ok) {
    writeToLogFile(`Card created successfully`, 'info', 'trello.js', 'createCard');

    // if we have attachments, add them to the card
    if (attachments.length > 0) {
      writeToLogFile(`Adding attachments to card`, 'info', 'trello.js', 'createCard');
      const card = await res.json();
      for (const attachment of attachments) {
        try {
          const buffer = Buffer.from(attachment.data, 'base64');
          const formData = new FormData();
          formData.append('key', config.trelloAppKey);
          formData.append('token', config.trelloUserToken);
          formData.append('file', buffer, attachment.name);

          const attachmentRes = await fetch(`https://api.trello.com/1/cards/${card.id}/attachments`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
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
      writeToLogFile(`All attachments processed`, 'info', 'trello.js', 'createCard');
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



// verify that our configured labels exist on all our configured boards, create them if they don't 
async function verifyLabels() {
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



// lookup and return the list ID of the "incoming" list on the specified board
async function getIncomingListIdOfBoard(trelloId) {
  const res = await fetch(`https://api.trello.com/1/boards/${trelloId}/lists?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    return resJson.find(list => list.name.toLowerCase() === "incoming").id;
  }
  else {
    return;
  }
}



// lookup and return the ID of the label with the specified name on the specified board
async function getLabelIdByName(trelloId, labelName) {
  const res = await fetch(`https://api.trello.com/1/boards/${trelloId}/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    const label = resJson.find(label => label.name.toLowerCase() === labelName.toLowerCase());
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



// lookup and return the ID of the board with the specified trelloId (we need these for card and label creation calls)
async function getBoardIdByTrelloId(trelloId) {
  const res = await fetch(`https://api.trello.com/1/boards/${trelloId}?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    return resJson.id;
  }
  else {
    return;
  }
}



// nuke all labels on the provided board (start fresh) - make certain you intend to use this before calling it, it will wipe custom labels you added too!
async function deleteAllLabelsOnBoard(trelloId) {
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


// loop through ALL configured boards and delete ALL labels on each board (use with caution!)
async function deleteAllLabelsOnAllBoards() {
  for (const board of trelloBoards) {
    const trelloId = board.trelloId;
    await deleteAllLabelsOnBoard(trelloId);
  }
}


module.exports = { createCard, verifyLabels, deleteAllLabelsOnBoard, deleteAllLabelsOnAllBoards };
