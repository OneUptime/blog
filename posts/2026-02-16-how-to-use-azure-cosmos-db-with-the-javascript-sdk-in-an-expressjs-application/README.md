# How to Use Azure Cosmos DB with the JavaScript SDK in an Express.js Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cosmos DB, JavaScript, Express.js, Node.js, SDK, REST API, NoSQL

Description: Integrate Azure Cosmos DB into an Express.js application using the JavaScript SDK with full CRUD operations, queries, and middleware patterns.

---

Express.js remains one of the most popular frameworks for building Node.js APIs. When you pair it with Azure Cosmos DB, you get a globally distributed database with a familiar JavaScript SDK. The `@azure/cosmos` package gives you a clean, promise-based API that works naturally with Express's async middleware.

In this post, we will build a complete Express.js application that uses the Cosmos DB JavaScript SDK for a task management API. We will cover initialization, CRUD operations, querying, pagination, and common patterns you will use in production.

## Project Setup

```bash
# Initialize the project
mkdir express-cosmos && cd express-cosmos
npm init -y

# Install dependencies
npm install express @azure/cosmos dotenv uuid

# Install dev dependencies
npm install -D nodemon
```

## Configure the Cosmos DB Client

Create a module that initializes and exports the Cosmos DB client. This pattern ensures a single client instance is shared across the application.

```javascript
// src/cosmos.js
// Cosmos DB client initialization - singleton pattern
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

// Read configuration from environment variables
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || 'TaskDB';
const containerId = process.env.COSMOS_CONTAINER || 'Tasks';

// Create the client once and reuse it
const client = new CosmosClient({ endpoint, key });

// Get references to the database and container
const database = client.database(databaseId);
const container = database.container(containerId);

// Initialize the database and container if they do not exist
async function initialize() {
  const { database: db } = await client.databases.createIfNotExists({
    id: databaseId,
  });

  await db.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: ['/userId'] },  // Partition by user for efficient queries
    defaultTtl: -1,  // No automatic expiration
  });

  console.log('Cosmos DB initialized successfully');
}

module.exports = { container, initialize };
```

## Define the Express App

Set up the Express application with JSON parsing and error handling middleware.

```javascript
// src/app.js
// Express application setup
const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Mount the task routes
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Handle Cosmos DB specific errors
  if (err.code === 404) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  if (err.code === 409) {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  if (err.code === 429) {
    const retryAfter = err.retryAfterInMs || 1000;
    res.set('Retry-After', Math.ceil(retryAfter / 1000));
    return res.status(429).json({ error: 'Too many requests', retryAfterMs: retryAfter });
  }

  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
```

## Implement CRUD Routes

Build the task management routes with full CRUD support.

```javascript
// src/routes/tasks.js
// Express routes for task CRUD operations
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { container } = require('../cosmos');

const router = express.Router();

// CREATE - Add a new task
router.post('/', async (req, res, next) => {
  try {
    const { title, description, userId, priority } = req.body;

    // Validate required fields
    if (!title || !userId) {
      return res.status(400).json({ error: 'title and userId are required' });
    }

    const task = {
      id: uuidv4(),
      title,
      description: description || '',
      userId,        // This is our partition key
      priority: priority || 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await container.items.create(task);
    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
});

// READ - Get a single task by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // Point read - the most efficient Cosmos DB operation
    const { resource } = await container.item(id, userId).read();

    if (!resource) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(resource);
  } catch (err) {
    next(err);
  }
});

// READ - List tasks for a user with pagination
router.get('/', async (req, res, next) => {
  try {
    const { userId, completed, limit = 20, continuationToken } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // Build the query dynamically based on filters
    let query = 'SELECT * FROM c WHERE c.userId = @userId';
    const parameters = [{ name: '@userId', value: userId }];

    if (completed !== undefined) {
      query += ' AND c.completed = @completed';
      parameters.push({ name: '@completed', value: completed === 'true' });
    }

    query += ' ORDER BY c.createdAt DESC';

    // Execute the query with pagination
    const queryOptions = {
      maxItemCount: parseInt(limit, 10),
      partitionKey: userId,
    };

    if (continuationToken) {
      queryOptions.continuationToken = continuationToken;
    }

    const { resources, continuationToken: nextToken } = await container.items
      .query({ query, parameters }, queryOptions)
      .fetchNext();

    res.json({
      tasks: resources,
      continuationToken: nextToken || null,
      count: resources.length,
    });
  } catch (err) {
    next(err);
  }
});

// UPDATE - Modify an existing task
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required in the body' });
    }

    // First read the existing task
    const { resource: existing } = await container.item(id, userId).read();
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Merge the updates
    const updated = {
      ...existing,
      ...req.body,
      id,                // Ensure ID does not change
      userId,            // Ensure partition key does not change
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await container.item(id, userId).replace(updated);
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

// UPDATE - Toggle task completion
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const { resource: task } = await container.item(id, userId).read();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.completed = !task.completed;
    task.updatedAt = new Date().toISOString();

    const { resource } = await container.item(id, userId).replace(task);
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

// DELETE - Remove a task
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    await container.item(id, userId).delete();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

## Start the Server

```javascript
// src/server.js
// Entry point that initializes Cosmos DB and starts Express
const app = require('./app');
const { initialize } = require('./cosmos');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Initialize Cosmos DB before accepting requests
    await initialize();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
```

## Environment Variables

Create a `.env` file for local development.

```bash
# .env - Cosmos DB connection details
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE=TaskDB
COSMOS_CONTAINER=Tasks
PORT=3000
```

## Testing with curl

```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write blog post","userId":"user-1","priority":"high"}'

# List tasks for a user
curl "http://localhost:3000/api/tasks?userId=user-1"

# Get a specific task
curl "http://localhost:3000/api/tasks/TASK_ID?userId=user-1"

# Toggle completion
curl -X PATCH "http://localhost:3000/api/tasks/TASK_ID/toggle?userId=user-1"

# Delete a task
curl -X DELETE "http://localhost:3000/api/tasks/TASK_ID?userId=user-1"
```

## Performance Considerations

Point reads (fetching a document by `id` and partition key) are the cheapest Cosmos DB operations at roughly 1 RU. Always prefer point reads over queries when you know the exact document you need.

For listing operations, always filter by the partition key. Our API requires `userId` on every request, which ensures queries target a single partition instead of fanning out across all partitions.

The continuation token pattern we use for pagination is important. It is more efficient than OFFSET/LIMIT because Cosmos DB does not have to skip over documents. The continuation token tells the database exactly where to resume.

## Summary

Integrating Cosmos DB with Express.js is straightforward with the `@azure/cosmos` package. The SDK's promise-based API maps cleanly to Express's async middleware pattern. The main things to remember are: initialize the client once at startup, always include the partition key in your operations, use point reads when possible, and implement proper error handling for Cosmos DB-specific status codes like 429 (rate limited). This combination gives you a scalable API that benefits from Cosmos DB's global distribution and low latency.
