# Use the official Playwright image which comes with Node.js and browsers pre-installed
# This avoids the need to install system dependencies manually
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# Set the working directory
WORKDIR /app

# Copy package files strictly for caching layers
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
