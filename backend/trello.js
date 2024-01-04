// This is where the backend logic to handle creating a new trello card will go. 
// We will use the Trello API to create a new card based on the info submitted in the form.

const config = require("./config.json");
const trelloBoards = config.trelloBoards;
const trelloLabels = config.trelloBoardLabels;


// create a new card on the incoming list for the specified board based on event
async function createCard(title, teamNumber, frcEvent, problemCategory, priority, description, attachments) {
  // find the id of the board in trelloBoards where the name matches the frcEvent
  const boardId = trelloBoards.find(board => board.frontendEventSelection.toLowerCase() === frcEvent.toLowerCase()).boardID;
  // find the id of the incoming list on the board so we can create the card there
  const listId = await getIncomingListIdOfBoard(boardId);
  // create a formatted and detailed description for the card
  const formattedDescription = `**This is a submitted request that was added automatically**\n\nTeam Number: ${teamNumber}\n\nCategory: ${problemCategory}\n\nPriority: ${priority}\n\nDescription: ${description}`;
  // need to add labels for the problem category and priority level, so get the ids of the labels
  const problemCategoryLabelId = await getLabelIdByName(boardId, problemCategory);
  const priorityLabelId = await getLabelIdByName(boardId, priority);

  // create the card
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
    const resJson = await res.json();
    console.log(resJson);
    console.log("Card created successfully");
  }
  else {
    console.log(`Error creating card on board ${boardId} ---> ${res.status}: ${res.statusText}`);
    try {
      const errorResponse = await createRes.json();
      console.log('Error Details:', errorResponse);
    } catch (error) {
      console.error('Error parsing create label response:', error);
    }
  }
}


// returns the id of the incoming list on the board
async function getIncomingListIdOfBoard(boardId) {
  const res = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
  if (res.ok) {
    const resJson = await res.json();
    return resJson.find(list => list.name.toLowerCase() === "incoming").id;
  }
  else {
    return;
  }
}


// trelloLabels is an array of all of the labels we expect to see in each board, if we don't see one in the board matching the one in the array, we will create it
async function verifyLabels() {
  // iterate through each board
  for (const board of trelloBoards) {
    // get the id of the board
    const boardId = board.boardID;
    // get the labels on the board
    const res = await fetch(`https://api.trello.com/1/boards/${boardId}/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
    if (res.ok) {
      const resJson = await res.json();
      console.log(`Found ${resJson.length} labels on board ${boardId}`);
      // iterate through each label in trelloLabels
      for (const expectedLabel of trelloLabels) {
        // if we don't see the label in the board, create it
        if (!resJson.find(boardLabel => boardLabel.name.toLowerCase() === expectedLabel.name.toLowerCase())) {
          //console.log(`https://api.trello.com/1/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}&name=${encodeURIComponent(expectedLabel.name)}&color=${expectedLabel.color}&idBoard=${boardId}`)
          const res = await fetch(`https://api.trello.com/1/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}&name=${encodeURIComponent(expectedLabel.name)}&color=${expectedLabel.color}&idBoard=${boardId}`, {
            method: 'POST'
          });
          if (res.ok) {
            const resJson = await res.json();
            console.log(resJson);
            console.log(`Created label ${expectedLabel.name} on board ${boardId}`);
          }
          else {
            console.log(`Error creating label ${expectedLabel.name} on board ${boardId} ---> ${res.status}: ${res.statusText}`)
          }
        }
      }
    }
    else {
      console.log(`Error getting labels on board ${boardId}`);
    }
  }
}


// look up label id by name
async function getLabelIdByName(boardId, labelName) {
  const res = await fetch(`https://api.trello.com/1/boards/${boardId}/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
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


module.exports = { createCard, verifyLabels };
