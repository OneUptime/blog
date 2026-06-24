# How to Deploy a Node.js + MongoDB Stack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Node.js, MongoDB, Express, Docker Compose, REST API

Description: Deploy a production-ready Node.js API server with MongoDB using Docker Compose through Portainer, covering connection retry logic, Mongoose ODM, replica sets, and Mongo Express administration.

## Introduction

Node.js and MongoDB form a natural pairing due to their shared JSON-based data model. Deploying this stack via Portainer with Docker Compose ensures consistent configuration across environments, proper dependency ordering, and easy container management. This guide covers a practical setup with connection resilience, Mongoose ODM, and a web-based MongoDB admin interface.

## Prerequisites

- Portainer CE or BE with a supported Docker Engine release
- Node.js application (or start fresh with the provided example)
- Basic understanding of Node.js and MongoDB

## Step 1: Prepare the Node.js Dockerfile

```dockerfile
# Dockerfile

FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src/ ./src/

# Run as non-root user
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Use dumb-init to handle signals and zombie processes
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
```

## Step 2: Create the Docker Compose Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** and name it `node-mongo-app`. This example assumes you save the initialization script from Step 3 as `/opt/node-mongo-app/mongo/init.js` on the Docker host:

```yaml
version: "3.8"

services:
  # MongoDB database service
  mongodb:
    image: mongo:7.0
    container_name: node-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-adminpassword}
      MONGO_INITDB_DATABASE: nodeapp
    volumes:
      - mongo_data:/data/db
      - mongo_config:/data/configdb
      - /opt/node-mongo-app/mongo/init.js:/docker-entrypoint-initdb.d/init.js:ro
    networks:
      - node-net
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--host", "localhost", "-u", "${MONGO_ROOT_USER:-admin}", "-p", "${MONGO_ROOT_PASSWORD:-adminpassword}", "--authenticationDatabase", "admin", "--eval", "db.adminCommand({ ping: 1 }).ok"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s

  # Node.js application
  api:
    image: ${NODE_IMAGE:-node-api:latest}
    container_name: node-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3000"
      MONGODB_URI: mongodb://nodeuser:nodepassword@mongodb:27017/nodeapp?authSource=nodeapp
      JWT_SECRET: ${JWT_SECRET:-change-this-in-production}
      LOG_LEVEL: info
    ports:
      - "3000:3000"
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - node-net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Mongo Express - web-based MongoDB admin
  mongo-express:
    image: mongo-express:1.0
    container_name: node-mongo-express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-adminpassword}@mongodb:27017/admin?authSource=admin
      ME_CONFIG_MONGODB_ENABLE_ADMIN: "true"
      ME_CONFIG_BASICAUTH_ENABLED: "true"
      ME_CONFIG_BASICAUTH_USERNAME: ${ME_USERNAME:-admin}
      ME_CONFIG_BASICAUTH_PASSWORD: ${ME_PASSWORD:-adminpassword}
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - node-net

volumes:
  mongo_data:
  mongo_config:

networks:
  node-net:
    driver: bridge
```

## Step 3: MongoDB Initialization

Save the following as `/opt/node-mongo-app/mongo/init.js` on the Docker host. It runs once on first startup:

```javascript
// mongo/init.js - runs once on first startup
db = db.getSiblingDB('nodeapp');

// Create application user with limited permissions
db.createUser({
  user: 'nodeuser',
  pwd: 'nodepassword',
  roles: [{ role: 'readWrite', db: 'nodeapp' }]
});

// Create initial collections and indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

db.products.createIndex({ name: 'text' });
db.products.createIndex({ category: 1 });
db.products.createIndex({ createdAt: -1 });

print('MongoDB initialized for nodeapp');
```

## Step 4: Node.js Application with Mongoose

```javascript
// src/db.js - MongoDB connection with retry logic
const mongoose = require('mongoose');

const connectWithRetry = async () => {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      retries++;
      console.error(`MongoDB connection attempt ${retries}/${maxRetries} failed: ${err.message}`);
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  throw new Error('Failed to connect to MongoDB after maximum retries');
};

module.exports = { connectWithRetry };
```

```javascript
// src/models/User.js - Mongoose schema
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before save
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

```javascript
// src/index.js - Express server entry point
const express = require('express');
const { connectWithRetry } = require('./db');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    mongodb: dbState[require('mongoose').connection.readyState]
  });
});

// User routes
const userRouter = require('./routes/users');
app.use('/api/users', userRouter);

// Start server after DB connects
const port = process.env.PORT || 3000;

connectWithRetry().then(() => {
  app.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });
}).catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
```

## Step 5: Verify the Stack

```bash
# Check all containers are healthy
docker ps | grep node

# Test API health endpoint
curl http://localhost:3000/health

# Create a test user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Access Mongo Express at http://localhost:8081

# Watch live logs
docker logs node-api -f

# Check MongoDB directly
docker exec -it node-mongodb mongosh -u admin -p adminpassword \
  --authenticationDatabase admin \
  --eval "db.getSiblingDB('nodeapp').users.find({}, { name: 1, email: 1, _id: 0 }).toArray()"
```

## Step 6: Environment Variables for Portainer

Add these in the Stack **Environment Variables** section:

| Key | Value |
|-----|-------|
| `MONGO_ROOT_PASSWORD` | `your-secure-password` |
| `JWT_SECRET` | `your-64-char-secret` |
| `ME_PASSWORD` | `mongo-express-password` |
| `NODE_IMAGE` | `your-registry/node-api:latest` |

## Conclusion

Deploying Node.js with MongoDB via Portainer provides a solid API stack with proper connection retry logic, Mongoose ODM for schema validation and business logic, and Mongo Express for database administration. The health check on MongoDB ensures Node.js only connects after the database is accepting connections. For production deployments, restrict Mongo Express access to an internal network or remove it entirely, replace the example credentials with strong secrets, and consider enabling MongoDB replica sets for transaction support and high availability.
