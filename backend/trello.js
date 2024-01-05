// This is where the backend logic to handle creating a new trello card will go. 
// We will use the Trello API to create a new card based on the info submitted in the form.

const config = require("./config.json");
const trelloBoards = config.trelloBoards;
const trelloLabels = config.trelloBoardLabels;


// create a new card on the incoming list for the specified board based on event
async function createCard(title, teamNumber, frcEvent, problemCategory, priority, description, attachments) {
  // find the id of the board we want to create the card on according to the selected event
  const boardId = trelloBoards.find(board => board.frontendEventSelection.toLowerCase() === frcEvent.toLowerCase()).boardID;

  // find the id of the "incoming" list on the board so we can create the card there
  const listId = await getIncomingListIdOfBoard(boardId);
  const formattedDescription = `**This is a submitted request that was added automatically**\n\nTeam Number: ${teamNumber}\n\nCategory: ${problemCategory}\n\nPriority: ${priority}\n\nDescription: ${description}`;

  // lookup the IDs of the labels we want to add to the card based on the selected category and priority
  const problemCategoryLabelId = await getLabelIdByName(boardId, problemCategory);
  const priorityLabelId = await getLabelIdByName(boardId, priority);

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



// verify that our configured labels exist on all our configured boards, create them if they don't 
//! (label creation not working because trello hates me I guess, literally no idea why. This is exactly how it's done in the docs. Looking up labels works, creating them doesn't and complains about the board ID. WHY?)
async function verifyLabels() {
  for (const board of trelloBoards) {
    const boardId = board.boardID;
    // grab the labels currently present on the board, if any
    const res = await fetch(`https://api.trello.com/1/boards/${boardId}/labels?key=${config.trelloAppKey}&token=${config.trelloUserToken}`);
    if (res.ok) {
      const resJson = await res.json();
      console.log(`Found ${resJson.length} labels on board ${boardId}`);
      // iterate through each label in our local config
      for (const expectedLabel of trelloLabels) {
        // if we don't see our label on the board, create it
        if (!resJson.find(boardLabel => boardLabel.name.toLowerCase() === expectedLabel.name.toLowerCase())) {
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



// lookup and return the list ID of the "incoming" list on the specified board
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



// lookup and return the ID of the label with the specified name on the specified board
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
