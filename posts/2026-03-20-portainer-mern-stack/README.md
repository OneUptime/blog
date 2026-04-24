# How to Deploy a MERN Stack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, MERN Stack, MongoDB, Express, React, Node.js, Docker Compose

Description: Deploy a complete MERN (MongoDB, Express, React, Node.js) stack using Docker Compose through Portainer, with a Vite-powered React frontend and a MongoDB-backed Express API.

## Introduction

The MERN stack (MongoDB, Express.js, React, Node.js) is one of the most popular JavaScript full-stack combinations for building modern web applications. Using Portainer Stacks, you can deploy and manage all components - database, API server, and frontend - with a single Docker Compose file. This guide covers development and production configurations.

## Prerequisites

- Portainer CE or BE running with Docker Engine 20.10+
- Basic knowledge of React and Express.js
- At least 1.5 GB of available RAM

## Step 1: Navigate to Portainer Stacks

Go to **Stacks** → **Add Stack** → **Web Editor**. Name the stack `mern-app`.

## Step 2: Write the Docker Compose File

```yaml
services:
  # MongoDB - document database
  mongodb:
    image: mongo:7.0
    container_name: mern-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-adminpassword}
      MONGO_INITDB_DATABASE: mernapp
    volumes:
      - mongo_data:/data/db
    networks:
      - mern-net
    healthcheck:
      test: ["CMD-SHELL", "mongosh --quiet \"mongodb://$$MONGO_INITDB_ROOT_USERNAME:$$MONGO_INITDB_ROOT_PASSWORD@localhost:27017/admin?authSource=admin\" --eval \"db.adminCommand('ping').ok\" | grep 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Express + Node.js backend API
  backend:
    image: node:20-alpine
    container_name: mern-backend
    restart: unless-stopped
    working_dir: /app
    volumes:
      - /opt/mern/backend:/app
      - /app/node_modules
    command: sh -c "npm install && npm run dev"
    environment:
      NODE_ENV: development
      PORT: 5000
      MONGO_URI: mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-adminpassword}@mongodb:27017/mernapp?authSource=admin
      JWT_SECRET: ${JWT_SECRET:-change-this-secret}
      CLIENT_URL: ${CLIENT_URL:-http://127.0.0.1:3000}
    ports:
      - "5000:5000"
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - mern-net

  # React frontend (Vite dev server)
  frontend:
    image: node:20-alpine
    container_name: mern-frontend
    restart: unless-stopped
    working_dir: /app
    volumes:
      - /opt/mern/frontend:/app
      - /app/node_modules
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0 --port 3000 --strictPort"
    environment:
      VITE_API_URL: ${VITE_API_URL:-http://127.0.0.1:5000/api}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - mern-net

volumes:
  mongo_data:
    driver: local

networks:
  mern-net:
    driver: bridge
```

## Step 3: Add Environment Variables in Portainer

The bind mounts above use absolute host paths because the Web Editor does not provide repository-relative bind mounts. Make sure your application source already exists on the Docker host under `/opt/mern/backend` and `/opt/mern/frontend`. If you want to use `./backend` and `./frontend`, deploy the stack from a Git repository in Portainer BE with relative path support enabled.

In the Stack editor under **Environment Variables**, add values that match where users will reach the app:

| Key | Value |
|-----|-------|
| `MONGO_ROOT_USER` | `admin` |
| `MONGO_ROOT_PASSWORD` | `your-secure-password` |
| `JWT_SECRET` | `your-jwt-secret-64-chars` |
| `CLIENT_URL` | `http://YOUR_SERVER_IP:3000` |
| `VITE_API_URL` | `http://YOUR_SERVER_IP:5000/api` |

## Step 4: Express Backend Setup

```javascript
// backend/src/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// MongoDB connection with retry
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    setTimeout(connectDB, 5000);  // Retry after 5 seconds
  }
};
connectDB();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

// Tasks API example
const Task = mongoose.model('Task', new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}));

app.get('/api/tasks', async (req, res) => {
  const tasks = await Task.find().sort('-createdAt');
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const task = await Task.create(req.body);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
```

## Step 5: React Frontend with Vite

```javascript
// frontend/src/App.jsx
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/tasks`)
      .then(r => r.json())
      .then(setTasks);
  }, []);

  const addTask = async () => {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask })
    });
    const task = await res.json();
    setTasks([task, ...tasks]);
    setNewTask('');
  };

  return (
    <div>
      <h1>MERN Task Manager</h1>
      <input value={newTask} onChange={e => setNewTask(e.target.value)} />
      <button onClick={addTask}>Add Task</button>
      <ul>
        {tasks.map(t => <li key={t._id}>{t.title}</li>)}
      </ul>
    </div>
  );
}

export default App;
```

## Step 6: Production Compose File

```yaml
# docker-compose.prod.yml - standalone production compose file

services:
  mongodb:
    image: mongo:7.0
    container_name: mern-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: mernapp
    volumes:
      - mongo_data:/data/db
    networks:
      - mern-net
    healthcheck:
      test: ["CMD-SHELL", "mongosh --quiet \"mongodb://$$MONGO_INITDB_ROOT_USERNAME:$$MONGO_INITDB_ROOT_PASSWORD@localhost:27017/admin?authSource=admin\" --eval \"db.adminCommand('ping').ok\" | grep 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    image: your-registry/mern-backend:latest
    container_name: mern-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGO_URI: mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongodb:27017/mernapp?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      CLIENT_URL: ${CLIENT_URL}   # Example: http://YOUR_SERVER_IP
    ports:
      - "5000:5000"
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - mern-net

  frontend:
    image: your-registry/mern-frontend:latest
    container_name: mern-frontend
    restart: unless-stopped
    ports:
      - "80:80"    # Built frontend served by Nginx
    depends_on:
      - backend
    networks:
      - mern-net

volumes:
  mongo_data:
    driver: local

networks:
  mern-net:
    driver: bridge
```

## Step 7: Verify and Manage

```bash
# Check all services are running
docker ps | grep mern

# Verify API health
curl http://localhost:5000/api/health

# Test task creation
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task from curl"}'

# View MongoDB data
docker exec -it mern-mongodb mongosh -u admin -p your-secure-password \
  --authenticationDatabase admin \
  --eval "use mernapp; db.tasks.find()"

# Watch logs across all services in Portainer:
# Stacks → mern-app → select each service container
```

## Conclusion

Deploying the MERN stack via Portainer encapsulates all four components in isolated containers while sharing a private Docker network. The MongoDB health check ensures the backend only starts after the database is ready, preventing startup race conditions. For production deployments, replace the `node:20-alpine` development images with properly built Docker images containing only production dependencies, and store all secrets in Portainer's environment variable store. The React frontend's Vite dev server should be replaced with an Nginx container serving the production build, and the frontend image should be built with the correct `VITE_API_URL` because Vite injects `VITE_*` variables at build time.
