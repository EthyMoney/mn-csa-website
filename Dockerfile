# Base image for nodejs (Current)
FROM node:current

# Set the shell to bash
SHELL ["/bin/bash", "-c"]

# Create app directory
WORKDIR /usr/src/app

# Copy in the src files
COPY . .

# Replace the config file with the docker template file (prevents leaking your keys to the docker image, you're welcome)
RUN cp config-template.json config/config.json

# Delete the log file so it doesn't get included in the image and a fresh one gets created
RUN rm -f config/backend.log

# Install the production dependencies
RUN npm ci --omit=dev

# Expose port 3000 for API
EXPOSE 3000

# Set the node environment to production
ENV NODE_ENV production

# Define the app run command
CMD [ "npm", "start" ]