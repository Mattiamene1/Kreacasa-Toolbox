# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies (skip devDependencies)
RUN npm install --only=production

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (adjust if your app runs on a different port)
EXPOSE 3000

# Run the app using the "start" script for production
CMD ["npm", "run", "start"]
