# How to Set Up a MERN Stack with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, MERN, MongoDB, Express, React, Node.js

Description: A complete guide to setting up a MERN stack (MongoDB, Express, React, Node.js) development environment using Podman containers and pods with hot reloading.

---

> The MERN stack in Podman pods gives you isolated MongoDB, Express, and React containers that share a network and reload on code changes, matching modern development workflows.

The MERN stack uses MongoDB, Express.js, React, and Node.js to build full-stack JavaScript applications. Running each component in a Podman container gives you a clean, reproducible environment. This post covers building a complete MERN development environment with Podman, including hot reloading for both the React frontend and Express backend.

---

## Project Structure

```bash
mkdir -p mern-project/{api,frontend,init}
cd mern-project
```

The project structure:

```text
mern-project/
  api/               # Express.js backend
  frontend/          # React frontend
  init/              # MongoDB seed scripts
  Containerfile.api  # API container image
  Containerfile.fe   # Frontend container image
```

## MongoDB Setup

Create a seed script for initial data:

```javascript
// init/01-seed.js
db.createCollection("todos");

db.todos.insertMany([
  {
    text: "Learn Podman",
    completed: true,
    priority: "high",
    createdAt: new Date()
  },
  {
    text: "Build a MERN app",
    completed: false,
    priority: "high",
    createdAt: new Date()
  },
  {
    text: "Write documentation",
    completed: false,
    priority: "medium",
    createdAt: new Date()
  }
]);

db.todos.createIndex({ completed: 1 });
db.todos.createIndex({ priority: 1 });
```

## Building the Express API

`api/package.json`:

```json
{
  "name": "mern-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.1.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}
```

```javascript
// api/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// MongoDB connection (localhost because we use a Podman pod)
const MONGO_URI = process.env.MONGO_URI
  || 'mongodb://admin:adminpass@localhost:27017/mernapp?authSource=admin';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Todo schema and model
const todoSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
todoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Todo = mongoose.model('Todo', todoSchema);

// Routes

// GET /api/todos - Fetch all todos with optional filtering
app.get('/api/todos', async (req, res) => {
  try {
    const { completed, priority, sort } = req.query;
    let filter = {};

    if (completed !== undefined) filter.completed = completed === 'true';
    if (priority) filter.priority = priority;

    const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const todos = await Todo.find(filter).sort(sortOrder);
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/todos - Create a new todo
app.post('/api/todos', async (req, res) => {
  try {
    const todo = new Todo({
      text: req.body.text,
      priority: req.body.priority || 'medium'
    });
    await todo.save();
    res.status(201).json(todo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/todos/:id - Update a todo
app.patch('/api/todos/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.text !== undefined) updates.text = req.body.text;
    if (req.body.completed !== undefined) updates.completed = req.body.completed;
    if (req.body.priority !== undefined) updates.priority = req.body.priority;
    updates.updatedAt = new Date();

    const todo = await Todo.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/todos/:id - Delete a todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats - Get todo statistics
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Todo.countDocuments();
    const completed = await Todo.countDocuments({ completed: true });
    const byPriority = await Todo.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    res.json({ total, completed, pending: total - completed, byPriority });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
```

API Containerfile:

```dockerfile
# Containerfile.api

FROM node:24-bookworm-slim

WORKDIR /app

# Install dependencies
COPY api/package*.json ./
RUN npm install

# Copy source code
COPY api/ .

EXPOSE 3001

# Use nodemon for hot reloading in development
CMD ["npx", "nodemon", "--watch", ".", "server.js"]
```

## Building the React Frontend

Create a React application with API integration:

`frontend/package.json`:

```json
{
  "name": "mern-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.1",
    "vite": "^8.0.0"
  },
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

`frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    },
    watch: {
      usePolling: true
    }
  }
});
```

`frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MERN Todo App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`frontend/src/main.jsx`:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```jsx
// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);

  // Fetch todos from the API
  const fetchTodos = useCallback(async () => {
    try {
      let url = `${API_BASE}/todos`;
      if (filter === 'completed') url += '?completed=true';
      if (filter === 'pending') url += '?completed=false';

      const response = await fetch(url);
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    }
  }, [filter]);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchTodos();
    fetchStats();
  }, [fetchTodos]);

  // Add a new todo
  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await fetch(`${API_BASE}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTodo, priority })
      });
      setNewTodo('');
      fetchTodos();
      fetchStats();
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  };

  // Toggle todo completion
  const toggleTodo = async (id, completed) => {
    try {
      await fetch(`${API_BASE}/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      });
      fetchTodos();
      fetchStats();
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  // Delete a todo
  const deleteTodo = async (id) => {
    try {
      await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
      fetchTodos();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>MERN Todo App</h1>
      <p>Running on Podman</p>

      {stats && (
        <div>
          <strong>Total: {stats.total}</strong> |
          Completed: {stats.completed} |
          Pending: {stats.pending}
        </div>
      )}

      <form onSubmit={addTodo} style={{ margin: '20px 0' }}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="What needs to be done?"
          style={{ width: '60%', padding: '8px' }}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" style={{ padding: '8px 16px' }}>Add</button>
      </form>

      <div style={{ margin: '10px 0' }}>
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('pending')}>Pending</button>
        <button onClick={() => setFilter('completed')}>Completed</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li key={todo._id} style={{
            padding: '10px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo._id, todo.completed)}
            />
            <span style={{
              flex: 1,
              textDecoration: todo.completed ? 'line-through' : 'none'
            }}>
              {todo.text}
            </span>
            <span style={{
              fontSize: '12px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor:
                todo.priority === 'high' ? '#ffcccc' :
                todo.priority === 'medium' ? '#ffffcc' : '#ccffcc'
            }}>
              {todo.priority}
            </span>
            <button onClick={() => deleteTodo(todo._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

Frontend Containerfile:

```dockerfile
# Containerfile.fe
FROM node:24-bookworm-slim

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source code
COPY frontend/ .

EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]
```

## Creating and Running the Pod

```bash
# Create the pod with all necessary port mappings
podman pod create \
  --name mern-stack \
  -p 3000:3000 \
  -p 3001:3001 \
  -p 27017:27017

# Start MongoDB
podman run -d \
  --pod mern-stack \
  --name mern-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
  -e MONGO_INITDB_DATABASE=mernapp \
  -v mern-mongo-data:/data/db:Z \
  -v ./init:/docker-entrypoint-initdb.d:Z \
  mongo:7

# Wait for MongoDB to be ready
sleep 5

# Build and start the Express API
podman build -t mern-api -f Containerfile.api .
podman run -d \
  --pod mern-stack \
  --name mern-api \
  -v ./api:/app:Z \
  -v mern-api-node-modules:/app/node_modules:copy \
  -e MONGO_URI="mongodb://admin:adminpass@localhost:27017/mernapp?authSource=admin" \
  mern-api

# Build and start the React frontend
podman build -t mern-frontend -f Containerfile.fe .
podman run -d \
  --pod mern-stack \
  --name mern-frontend \
  -v ./frontend/src:/app/src:Z \
  mern-frontend
```

## Production Build with a Single Container

For production, you can build the React app and serve it from Express:

```dockerfile
# Containerfile.prod
# Stage 1: Build the React frontend
FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build the production API server
FROM node:24-bookworm-slim
WORKDIR /app
COPY api/package*.json ./
RUN npm install --omit=dev
COPY api/ .

# Copy the built React files into a public directory
COPY --from=frontend-build /app/dist ./public

# Add static file serving to Express
# (In production, add: app.use(express.static('public')) to server.js)

EXPOSE 3001
CMD ["node", "server.js"]
```

## Verifying the Stack

```bash
# Check pod status
podman pod ps

# Test the API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/todos | python3 -m json.tool
curl http://localhost:3001/api/stats | python3 -m json.tool

# The React app is available at http://localhost:3000

# View logs for each service
podman logs mern-api
podman logs mern-frontend
podman logs mern-mongo
```

## Management Script

```bash
#!/bin/bash
# mern.sh - Manage the MERN stack

case "${1:-help}" in
  start)
    podman pod create --name mern-stack \
      -p 3000:3000 -p 3001:3001 -p 27017:27017 2>/dev/null
    podman run -d --pod mern-stack --name mern-mongo \
      -e MONGO_INITDB_ROOT_USERNAME=admin \
      -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
      -e MONGO_INITDB_DATABASE=mernapp \
      -v mern-mongo-data:/data/db:Z \
      -v ./init:/docker-entrypoint-initdb.d:Z mongo:7
    sleep 5
    podman build -t mern-api -f Containerfile.api . -q
    podman run -d --pod mern-stack --name mern-api \
      -v ./api:/app:Z \
      -v mern-api-node-modules:/app/node_modules:copy \
      -e MONGO_URI="mongodb://admin:adminpass@localhost:27017/mernapp?authSource=admin" \
      mern-api
    podman build -t mern-frontend -f Containerfile.fe . -q
    podman run -d --pod mern-stack --name mern-frontend \
      -v ./frontend/src:/app/src:Z mern-frontend
    echo "React: http://localhost:3000 | API: http://localhost:3001/api"
    ;;
  stop) podman pod stop mern-stack && podman pod rm mern-stack ;;
  restart) $0 stop; $0 start ;;
  *) echo "Usage: $0 {start|stop|restart}" ;;
esac
```

## Conclusion

The MERN stack fits naturally into a Podman pod, with MongoDB, Express, and React each running in their own container but sharing a network namespace. The React development server proxies API calls to Express, and Express connects to MongoDB, all over localhost within the pod. Volume mounts enable hot reloading for both the frontend and backend, giving you a fast development feedback loop. For production, a multi-stage build compiles the React app and serves it from Express in a single container.
