# Use Node image
FROM node:18

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy remaining files
COPY . .

# Expose port
EXPOSE 5000

# Run server
CMD ["npm", "run", "dev"]