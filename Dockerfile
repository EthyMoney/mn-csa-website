# Base image for nodejs (LTS)
FROM node:lts

# Set the shell to bash
SHELL ["/bin/bash", "-c"]

# Create app directory
WORKDIR /usr/src/app

# Copy in the src files
COPY . .

# Replace the config file with the docker template file (prevents leaking your keys to the docker image, you're welcome)
RUN mv config/config-docker-template.json config/config.json

# Install the production dependencies
RUN npm ci --only=production

# Expose port 3000 for API
EXPOSE 3000

# Set the node environment to production
ENV NODE_ENV production

# Define the app run command
CMD [ "npm", "start" ]