# How to Deploy a Node.js + MongoDB Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Node.js, MongoDB, Docker Compose, JavaScript, REST API

Description: Learn how to deploy a Node.js REST API with MongoDB via Portainer, with proper connection handling, health checks, and persistent data storage.

---

Node.js with MongoDB is a natural fit for JSON-centric REST APIs. Portainer manages the two-container stack with log visibility and easy environment variable management.

## Compose Stack

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: mongopass    # Change this
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD-SHELL", "mongosh --username \"$$MONGO_INITDB_ROOT_USERNAME\" --password \"$$MONGO_INITDB_ROOT_PASSWORD\" --authenticationDatabase admin --eval \"db.adminCommand('ping')\""]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: node:20-alpine
    restart: unless-stopped
    depends_on:
      mongo:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://root:mongopass@mongo:27017/nodeapp?authSource=admin
      PORT: 3000
      NODE_ENV: production
    volumes:
      - /opt/node-mongo-api:/app   # Host path with package.json and server.js
    working_dir: /app
    command: sh -c "npm install --omit=dev && node server.js"

volumes:
  mongo_data:
```

## Node.js API with Mongoose

```javascript
// api/server.js
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect with retry logic for container startup
const connectWithRetry = () => {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  })
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      setTimeout(connectWithRetry, 5000);   // Retry every 5 seconds
    });
};
connectWithRetry();

// Health check endpoint
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const status = dbState === 1 ? 'healthy' : 'degraded';
  res.status(dbState === 1 ? 200 : 503).json({ status, db: dbState });
});

app.listen(process.env.PORT || 3000);
```

## Package.json

```json
{
  "name": "node-mongo-api",
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^8.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

## Monitoring

Use OneUptime to monitor `http://<host>:3000/health`. The endpoint returns a `200` response with a JSON body that includes `"status":"healthy"` when MongoDB is connected. Alert on `503` responses to catch database connection failures before clients experience errors.
