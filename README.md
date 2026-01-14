# MN FRC CSA Support Request Website

This website is designed to help teams in FRC Northland get help from CSAs in a more efficient manner that can be easily tracked and managed. This is used to track issues both during and even outside of competition events.

### New to FRC or Not Sure What a CSA is?

A Control System Advisor (CSA) is a volunteer at FIRST Robotics Competition events that helps teams with their robot's control system. They are the folks in the bright orange baseball caps that are really easy to spot. Common things CSAs assist with include the RoboRIO, the radio, the driver station, the programming language, electronics, and just about anything else related to running the robot. CSAs are there to help teams keep their robot running and playing on the field throughout the event so they can have the best possible experience. CSAs also help teams learn about their control system and how to work with and troubleshoot it. CSAs are a great resource for teams to use both at events and at home outside of events. The orange hats are your friend!

## Contents

- [MN FRC CSA Support Request Website](#mn-frc-csa-support-request-website)
    - [New to FRC or Not Sure What a CSA is?](#new-to-frc-or-not-sure-what-a-csa-is)
  - [Contents](#contents)
  - [Running With Docker](#running-with-docker)
  - [Running Without Docker](#running-without-docker)
  - [Configuration](#configuration)
    - [Required Fields](#required-fields)
    - [Optional Fields](#optional-fields)
    - [Board Configuration](#board-configuration)
    - [Label Configuration](#label-configuration)
  - [Development](#development)
    - [Important files and directories](#important-files-and-directories)
    - [Important Commands](#important-commands)
  - [Disclaimer](#disclaimer)

## Running With Docker

Here's how to get started hosting your own version of this application using the pre-built docker image based on this repository.

1. Ensure you have Docker installed on your machine. Install it if needed.
2. Run the following command to install and start the container.
   + Note that there is a volume mount for the config directory. This is where the application stores its config and log files.
   + You can explicitly set your own directory for the config file mount if you'd like, just replace `mn-csa-website` before the semicolon with the absolute path to your desired directory.
   + If you are using Windows, I recommend leaving the mount the way it is to use Docker's volume mechanism to easily see the volume using Docker Desktop.
   + The container will run on port 3000 by default with a name of "mn-csa-website", but feel free to change these as desired.

```bash
docker run -d --name mn-csa-website -p 3000:3000 -v mn-csa-website:/usr/src/app/config:rw ultimate360/mn-csa-website
```

3. You're not done yet! The container should start and then stop, this is expected because your config file is not filled in. You need to add your board IDs and Trello app key and token to the config file. You can get your Trello app key and user token from [here](https://trello.com/power-ups/admin/). You can get your board trello ID by going to each of your Trello boards and copying the ID from the URL in the address bar, it looks something like `ihy6gZJK`. Once you have these, add them to the `config.json` file which can be found in your mapped volume or mount point used in the command.

4. Once you have your config file filled in, you can start the container again using the following command. The container should start and stay running this time. You will see output similar to the following if it starts successfully. Log entries will be written to a log file in the same directory as the config file so you can see what's happening behind the scenes and debug any issues that may arise.
  
```bash
1/14/2026 4:00:49 PM <INFO> (pre-checks.js)[checkIt] - Config file found, verifying it..
1/14/2026 4:00:49 PM <INFO> (pre-checks.js)[checkIt] - Config file looks good.
1/14/2026 4:00:49 PM <INFO> (pre-checks.js)[checkIt] - Pre-checks complete.
1/14/2026 4:00:50 PM <INFO> (logger.js)[trimLogFile] - Log file trim ran, 0 entries removed. Currently 11473 entries, oldest from 10/16/2025. File size 1.60 MB
1/14/2026 4:00:51 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board idy3xZJW
1/14/2026 4:00:51 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board pm29P25h
1/14/2026 4:00:51 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board 5jzi7iPY
1/14/2026 4:00:51 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board ijkLQFUb
1/14/2026 4:00:52 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board y35B6h3q
1/14/2026 4:00:52 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board w7CtTrwK
1/14/2026 4:00:52 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board ou3Xyr0D
1/14/2026 4:00:53 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board eAqHCPhJ
1/14/2026 4:00:53 PM <INFO> (trello.js)[verifyLabels] - Found 29 labels on board idy3xZJW
1/14/2026 4:00:53 PM <INFO> (host.js)[app.listen] - Server is running on http://localhost:3000
1/14/2026 4:00:53 PM <INFO> (host.js)[config-watcher] - Watching config file for changes...
```

5. That's it! You can now access your instance of the website by going to `http://localhost:3000` (or `http://localhost:3000/fta` for the FTA version) in your web browser. You can also access it from other devices on your network by replacing `localhost` with the IP address of the machine running the container.

## Running Without Docker

If you'd like to run the application without using Docker, you can do so by following these steps.

1. Clone the repository to your machine.
2. Install Node.js if you haven't already. You can find the installer for your operating system on the [Node.js website](https://nodejs.org/).
3. Open a terminal and navigate to the directory where you cloned the repository.
4. Run `npm install` to install the required dependencies.
5. Now fill in your config file located in the `config` directory. You can get your Trello app key and user token from [here](https://trello.com/power-ups/admin/). You can get your board trello ID by going to each of your Trello boards and copying the ID from the URL in the address bar, it looks something like `ihy6gZJK`. Once you have these, add them to the `config.json` file.
6. Run `npm start` to start the application. You should see output similar to what is shown in the Docker section above.
7. That's it! You can now access your instance of the website by going to `http://localhost:3000` (or `http://localhost:3000/fta` for the FTA version) in your web browser. You can also access it from other devices on your network by replacing `localhost` with the IP address of the machine running the application. Log entries will be written to a log file in the `config` directory so you can see what's happening behind the scenes and debug any issues that may arise.

## Configuration

The application is configured through a `config.json` file. On first run, a default config file will be created from `config-template.json` that you can customize.

### Required Fields

| Field | Description |
|-------|-------------|

| `trelloAppKey` | Your Trello API application key. Get it from [Trello Power-Ups Admin](https://trello.com/power-ups/admin/). |
| `trelloUserToken` | Your Trello API user token. Get it from the same page as the app key. |
| `trelloBoards` | Array of board configurations (see [Board Configuration](#board-configuration) below). |
| `trelloBoardLabels` | Array of label definitions (see [Label Configuration](#label-configuration) below). |

### Optional Fields

| Field | Default | Description |
|-------|---------|-------------|

| `apiKey` | `""` | Optional API key for authenticating requests. If empty, no API key is required. This is mainly used by external systems generating requests for CSAs programmatically, like FRC Nexus. |
| `appPort` | `3000` | The port the application will run on. |
| `defaultEvent` | First enabled event | The event that will be pre-selected in the form dropdown. Must match a `frontendEventSelection` value from your boards. |

### Board Configuration

Each board in the `trelloBoards` array has the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|

| `frontendEventSelection` | string | Yes | The display name shown in the event dropdown on the form. |
| `trelloId` | string | Yes | The Trello board ID. Find this in your board's URL (e.g., `https://trello.com/b/ihy6gZJK/board-name` → `ihy6gZJK`). |
| `enabled` | boolean | No | Whether this event is available for selection in the UI. Defaults to `false` if not specified. |

**Example:**

```json
{
  "frontendEventSelection": "Build/Off Season",
  "trelloId": "ihy6gZJK",
  "enabled": true
}
```

**Notes:**

- At least one board must be enabled for users to submit requests.
- The `defaultEvent` should match an enabled board's `frontendEventSelection` value.
- Boards with `"enabled": false` will not appear in the frontend dropdown.

### Label Configuration

Labels are automatically created on your Trello boards if they don't exist. Each label in the `trelloBoardLabels` array has:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | The label text displayed on Trello cards. |
| `color` | string | The label color. Must be a valid Trello color. |

**Valid Trello colors:** `green`, `yellow`, `orange`, `red`, `purple`, `blue`, `sky`, `lime`, `pink`, `black`

**Example:**

```json
{
  "name": "Code - Java",
  "color": "blue"
}
```

You can customize, add, or remove labels as needed for your use case. The default template includes common FRC-related categories like code languages, electronics issues, field problems, and priority levels.

## Development

So you want to contribute to the project or tweak things yourself? Great! Here's how to get started.

First, go ahead and follow the same steps as above in the "Running Without Docker" section to get the application configured and running on your machine. Once you have it running, you can make changes to the code and restart the app to see them reflected in the application.

### Important files and directories

- `config/config.json` - This is where you will put your Trello app key and token, as well as the Trello IDs of the boards you want to use with the application. See the [Configuration](#configuration) section for details on all available options including:
  - Enabling/disabling specific events with the `enabled` property
  - Setting a default event with `defaultEvent`
  - Configuring the app port with `appPort`
  - Adding an optional API key with `apiKey`
  - Customizing labels with the `trelloBoardLabels` array

- `config/backend.log` - This is the log file that the application creates and writes to as it does its thing. It contains organized messages from the application that can help with debugging and tracking what's happening behind the scenes. It's trimmed automatically to keep it from getting too large over time. Managed by `backend/logger.js`.

- `backend/host.js` - This is the entry point of the application when running and it's where an express server lives. This express server serves the frontend and has endpoints to handle interactions with the frontend (like getting the data of the form when it's submitted).

- `backend/trello.js` - This file contains all of the logic for interacting with the Trello REST API. It's where the app takes the submitted form data and creates a card on the Trello board. This is also where it checks and creates labels on the board if they don't exist at startup.

- `backend/pre-checks.js` - This file contains the logic for checking for the existence of the config file and the validity of its contents. This is what will create a default config for you if you don't have one, and will remind you to fill in missing fields if they are not present. This runs once at every startup of the application.

- `public/` - This directory contains the frontend portion of the application. It's where the HTML, CSS, and client-side JavaScript live. You can make changes to the frontend here and see them reflected in the application when you restart it.

- `public/fta/` - This directory contains the FTA page of the application. It's where the HTML, CSS, and client-side JavaScript live for the FTA page. You can make changes to the frontend here and see them reflected in the application when you restart it. Note that this version is essentially a cut down version of the main version so that FTAs can enter just the essential information needed to get help and do so quickly.

### Important Commands

For your convenience I added some NPM scripts to the package.json to make some dev tasks a little easier and more streamlined. Here's what's available:

- `npm start` - This command starts the application. It will run the pre-checks and then start the express server. You can access the application by going to `http://localhost:3000` in your web browser.

- `npm run docker-build` - This command will build a docker image of the application. Remember to edit the image repository and name to your own, it's set to my my public one by default.

- `npm run docker-push` - This command will push the docker image to the repository you specify. Use your own image and repository name you specified when building the image.

- `npm run docker-run` - This command will locally run the docker image you just built. Use your own image and repository name you specified when building the image.

- `npm run nuke-labels` - This command will remove all labels from all configured Trello boards. Be careful with this one, it's irreversible! This can be handy to clean up labels that are no longer needed or to start fresh on your boards so your labels match the config file. Heads up, it deletes ALL labels, even ones not created by the application.

## Disclaimer

This project and the associated [website](https://support.mnfrccsa.com) is not affiliated with FIRST or any of its programs or partners. This project is independently created and represented by Logan Steffen, a Minnesota CSA of 7 years.

Good luck teams, we can't wait to see you at the events!
