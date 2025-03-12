# Step 1: Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first for efficient caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the project files
COPY . .

# Build the Next.js app
RUN npm run build

# Step 2: Run Stage (Using a minimal image)
FROM node:18-alpine

WORKDIR /app

# Copy the built project from the builder stage
COPY --from=builder /app ./

# Expose port 3000
EXPOSE 3000

# Set environment variable to production
ENV NODE_ENV=production

# Start Next.js in production mode
CMD ["npm", "run", "start"]
