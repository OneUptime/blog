# How to Deploy a MEAN Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, MEAN Stack, MongoDB, Express, Angular, Node.js, Docker Compose

Description: Learn how to deploy a MEAN stack (MongoDB, Express.js, Angular, Node.js) via Portainer with separate containers for the database, backend, and frontend.

---

The MEAN stack uses JavaScript across the entire stack: Angular for the frontend, Node.js/Express for the API, and MongoDB for storage. Portainer makes it easy to manage all three services together.

## Compose Stack

```yaml
version: "3.8"

services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpass    # Change this
      MONGO_INITDB_DATABASE: meanapp

  api:
    image: node:20-alpine
    restart: unless-stopped
    working_dir: /app
    depends_on:
      - mongo
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://root:rootpass@mongo:27017/meanapp?authSource=admin
      PORT: 3000
      NODE_ENV: production
    volumes:
      - ./api:/app
    # Install dependencies and start the API server
    command: sh -c "npm install && node server.js"

  frontend:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "4200:80"
    volumes:
      - ./frontend/dist:/usr/share/nginx/html:ro  # Pre-built Angular dist

volumes:
  mongo_data:
```

## Sample Express API

Create `api/server.js` for the Node.js backend:

```javascript
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB using the container name
mongoose.connect(process.env.MONGODB_URI);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`API running on port ${process.env.PORT}`);
});
```

## Building Angular for Production

Build the Angular app before deploying:

```bash
# In your Angular project

ng build --configuration production

# The output goes to dist/your-app/ - mount this in the nginx container
```

## Monitoring

Use OneUptime to monitor `http://<host>:3000/api/health`. The endpoint reports both API and database health. Set up alerts for unhealthy status to catch MongoDB connection issues early.
