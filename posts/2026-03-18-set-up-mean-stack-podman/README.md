# How to Set Up a MEAN Stack with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, MEAN, MongoDB, Express, Angular, Node.js

Description: A complete guide to setting up a MEAN stack (MongoDB, Express, Angular, Node.js) development environment using Podman containers and pods.

---

> Podman pods group your MongoDB, Express API, and Angular frontend into a shared network namespace, simplifying how the MEAN stack components communicate during development.

The MEAN stack combines MongoDB, Express.js, Angular, and Node.js into a full JavaScript-based web application platform. Running these components in Podman containers provides an isolated, reproducible development environment. This post walks through building each component, connecting them through a Podman pod, and setting up a development workflow with live reloading.

---

## Project Structure

Start by creating the project directory structure:

```bash
mkdir -p mean-project/{api,frontend,init}
cd mean-project
```

The final structure will look like this:

```text
mean-project/
  api/               # Express.js backend
  frontend/          # Angular frontend
  init/              # MongoDB initialization scripts
  Containerfile.api  # API container image
  Containerfile.fe   # Frontend container image
```

## Setting Up MongoDB

Create a MongoDB initialization script that sets up the database with sample data:

```javascript
// init/01-init.js
// Runs on first container startup against the MONGO_INITDB_DATABASE

// Create application collections with schema validation
db.createCollection("articles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "content", "author"],
      properties: {
        title: { bsonType: "string", description: "Article title" },
        content: { bsonType: "string", description: "Article body" },
        author: { bsonType: "string", description: "Author name" },
        tags: { bsonType: "array", items: { bsonType: "string" } },
        published: { bsonType: "bool" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

// Insert sample data
db.articles.insertMany([
  {
    title: "Getting Started with Podman",
    content: "Podman is a daemonless container engine...",
    author: "Jane Developer",
    tags: ["podman", "containers", "devops"],
    published: true,
    createdAt: new Date()
  },
  {
    title: "MEAN Stack Best Practices",
    content: "Building modern web applications with the MEAN stack...",
    author: "John Engineer",
    tags: ["mean", "angular", "node"],
    published: true,
    createdAt: new Date()
  }
]);

// Create indexes
db.articles.createIndex({ title: "text", content: "text" });
db.articles.createIndex({ tags: 1 });
db.articles.createIndex({ createdAt: -1 });
```

## Building the Express.js API

Create the Express.js backend application:

```json
{
  "name": "mean-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.1.0",
    "cors": "^2.8.5"
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

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
// In a pod, MongoDB is reachable on localhost
const MONGO_URI = process.env.MONGO_URI
  || 'mongodb://admin:adminpass@localhost:27017/meanapp?authSource=admin';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define the Article schema and model
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  tags: [String],
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Article = mongoose.model('Article', articleSchema);

// API Routes

// GET /api/articles - List all articles
app.get('/api/articles', async (req, res) => {
  try {
    const { tag, search } = req.query;
    let query = {};

    if (tag) query.tags = tag;
    if (search) query.$text = { $search: search };

    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/:id - Get a single article
app.get('/api/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/articles - Create an article
app.post('/api/articles', async (req, res) => {
  try {
    const article = new Article(req.body);
    await article.save();
    res.status(201).json(article);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/articles/:id - Update an article
app.put('/api/articles/:id', async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/articles/:id - Delete an article
app.delete('/api/articles/:id', async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', database: dbState });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
```

Create the API Containerfile:

```dockerfile
# Containerfile.api

FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY api/package*.json ./
RUN npm install

# Copy application code
COPY api/ .

# Expose the API port
EXPOSE 3000

# Use nodemon for development (watches for file changes)
CMD ["npx", "nodemon", "server.js"]
```

## Building the Angular Frontend

Generate a new Angular application (or use an existing one). Here is a minimal setup:

```json
{
  "name": "mean-frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json",
    "build": "ng build --configuration production"
  },
  "dependencies": {
    "@angular/animations": "^17.1.0",
    "@angular/common": "^17.1.0",
    "@angular/compiler": "^17.1.0",
    "@angular/core": "^17.1.0",
    "@angular/forms": "^17.1.0",
    "@angular/platform-browser": "^17.1.0",
    "@angular/platform-browser-dynamic": "^17.1.0",
    "@angular/router": "^17.1.0",
    "rxjs": "~7.8.1",
    "zone.js": "~0.14.3"
  },
  "devDependencies": {
    "@angular/cli": "^17.1.0",
    "@angular/compiler-cli": "^17.1.0",
    "typescript": "~5.3.3"
  }
}
```

Create a proxy configuration to forward API requests to the Express backend:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Create a simple Angular service to communicate with the API:

```typescript
// frontend/src/app/services/article.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Article {
  _id?: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  published: boolean;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  // The proxy configuration routes /api to the Express backend
  private apiUrl = '/api/articles';

  constructor(private http: HttpClient) {}

  getArticles(tag?: string): Observable<Article[]> {
    const params = tag ? { tag } : {};
    return this.http.get<Article[]>(this.apiUrl, { params });
  }

  getArticle(id: string): Observable<Article> {
    return this.http.get<Article>(`${this.apiUrl}/${id}`);
  }

  createArticle(article: Article): Observable<Article> {
    return this.http.post<Article>(this.apiUrl, article);
  }

  updateArticle(id: string, article: Partial<Article>): Observable<Article> {
    return this.http.put<Article>(`${this.apiUrl}/${id}`, article);
  }

  deleteArticle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

Create the frontend Containerfile:

```dockerfile
# Containerfile.fe
FROM node:20-bookworm-slim

WORKDIR /app

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the application source
COPY frontend/ .

EXPOSE 4200

# Start the Angular dev server with proxy and polling for file changes
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200", \
  "--proxy-config", "proxy.conf.json", "--poll", "2000"]
```

## Creating and Running the Pod

Now bring everything together in a Podman pod:

```bash
# Create the pod with all necessary ports
podman pod create \
  --name mean-stack \
  -p 4200:4200 \
  -p 3000:3000 \
  -p 27017:27017

# Start MongoDB
podman run -d \
  --pod mean-stack \
  --name mean-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
  -e MONGO_INITDB_DATABASE=meanapp \
  -v mean-mongo-data:/data/db:Z \
  -v ./init:/docker-entrypoint-initdb.d:Z \
  mongo:7

# Wait for MongoDB to be ready
echo "Waiting for MongoDB..."
sleep 5

# Build and start the Express API
podman build -t mean-api -f Containerfile.api .
podman run -d \
  --pod mean-stack \
  --name mean-api \
  -v ./api/server.js:/app/server.js:Z \
  -e MONGO_URI="mongodb://admin:adminpass@localhost:27017/meanapp?authSource=admin" \
  mean-api

# Build and start the Angular frontend
podman build -t mean-frontend -f Containerfile.fe .
podman run -d \
  --pod mean-stack \
  --name mean-frontend \
  -v ./frontend/src:/app/src:Z \
  mean-frontend
```

## Verifying the Stack

```bash
# Check all containers in the pod are running
podman pod ps
podman ps --pod --filter pod=mean-stack

# Test the API health endpoint
curl http://localhost:3000/api/health

# List articles from the API
curl http://localhost:3000/api/articles | python3 -m json.tool

# Create a new article
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Article",
    "content": "Created via the MEAN stack on Podman",
    "author": "Developer",
    "tags": ["test"],
    "published": true
  }'

# Access the Angular frontend
echo "Frontend available at http://localhost:4200"
```

## Management Script

Create a script to manage the entire stack:

```bash
#!/bin/bash
# mean.sh - Manage the MEAN stack

ACTION=${1:-help}

start() {
    echo "Starting MEAN stack..."

    podman pod create --name mean-stack \
      -p 4200:4200 -p 3000:3000 -p 27017:27017 2>/dev/null

    podman run -d --pod mean-stack --name mean-mongo \
      -e MONGO_INITDB_ROOT_USERNAME=admin \
      -e MONGO_INITDB_ROOT_PASSWORD=adminpass \
      -e MONGO_INITDB_DATABASE=meanapp \
      -v mean-mongo-data:/data/db:Z \
      -v ./init:/docker-entrypoint-initdb.d:Z \
      mongo:7

    sleep 5

    podman build -t mean-api -f Containerfile.api . -q
    podman run -d --pod mean-stack --name mean-api \
      -v ./api/server.js:/app/server.js:Z \
      -e MONGO_URI="mongodb://admin:adminpass@localhost:27017/meanapp?authSource=admin" \
      mean-api

    podman build -t mean-frontend -f Containerfile.fe . -q
    podman run -d --pod mean-stack --name mean-frontend \
      -v ./frontend/src:/app/src:Z \
      mean-frontend

    echo "MEAN stack is running:"
    echo "  Angular:  http://localhost:4200"
    echo "  API:      http://localhost:3000/api"
    echo "  MongoDB:  localhost:27017"
}

stop() {
    echo "Stopping MEAN stack..."
    podman pod stop mean-stack
    podman pod rm mean-stack
}

case "$ACTION" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  logs-api) podman logs -f mean-api ;;
  logs-fe) podman logs -f mean-frontend ;;
  logs-db) podman logs -f mean-mongo ;;
  *) echo "Usage: $0 {start|stop|restart|logs-api|logs-fe|logs-db}" ;;
esac
```

## Conclusion

The MEAN stack runs well in Podman pods, with MongoDB, Express, and Angular each in their own container sharing a network namespace. The Angular development server proxies API requests to Express on localhost, and Express connects to MongoDB on localhost, all through the pod's shared networking. Volume mounts keep your source code on the host for live reloading during development. This setup gives you a reproducible, isolated MEAN development environment that you can start and tear down with a single command.
