# How to Use DynamoDB with Express.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Express.js, Node.js, JavaScript

Description: Learn how to build a REST API with Express.js and DynamoDB using the AWS SDK v3 for JavaScript, covering CRUD operations, error handling, and middleware.

---

Express.js paired with DynamoDB is one of the fastest ways to build a scalable API. No connection pools to manage, no schema migrations to run, and the AWS SDK v3 for JavaScript is tree-shakeable so your bundle stays lean. Let's build a complete CRUD API step by step.

## Project Setup

Initialize your project and install the dependencies.

```bash
# Create the project
mkdir dynamodb-express-api && cd dynamodb-express-api
npm init -y

# Install Express and the AWS SDK v3 DynamoDB modules
npm install express @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb uuid

# Install dev dependencies
npm install -D nodemon
```

The `@aws-sdk/lib-dynamodb` package is the Document Client - it handles marshalling/unmarshalling between JavaScript objects and DynamoDB's attribute format automatically. Trust me, you want this instead of dealing with `{ S: "value" }` everywhere.

## Project Structure

Here's the structure we're building.

```
dynamodb-express-api/
  src/
    config/
      dynamodb.js     # DynamoDB client configuration
    models/
      user.js         # User model with DynamoDB operations
    routes/
      users.js        # Express routes for user endpoints
    middleware/
      errorHandler.js # Error handling middleware
    app.js            # Express application setup
  index.js            # Server entry point
```

## DynamoDB Client Configuration

Set up the DynamoDB client with the Document Client wrapper.

```javascript
// src/config/dynamodb.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Configure the base DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  // Uncomment for local development with DynamoDB Local
  // endpoint: 'http://localhost:8000',
});

// Wrap it with the Document Client for automatic marshalling
// The marshallOptions control how JavaScript types map to DynamoDB types
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Don't send undefined values
    convertEmptyValues: false,   // Don't convert empty strings to NULL
  },
});

module.exports = { docClient };
```

## The User Model

Create a model that encapsulates all DynamoDB operations for the User entity.

```javascript
// src/models/user.js
const { v4: uuidv4 } = require('uuid');
const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');

const TABLE_NAME = process.env.USERS_TABLE || 'Users';

class UserModel {
  // Create a new user
  static async create({ name, email }) {
    const now = new Date().toISOString();
    const user = {
      user_id: uuidv4(),
      name,
      email,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    // PutItem with a condition to prevent overwriting existing items
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: user,
      ConditionExpression: 'attribute_not_exists(user_id)',
    }));

    return user;
  }

  // Get a single user by ID
  static async findById(userId) {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { user_id: userId },
    }));

    return response.Item || null;
  }

  // Find users by status using a GSI
  static async findByStatus(status, limit = 20) {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      Limit: limit,
    }));

    return response.Items;
  }

  // Update specific fields on a user
  static async update(userId, updates) {
    // Build the update expression dynamically from the provided fields
    const expressionParts = [];
    const expressionNames = {};
    const expressionValues = {};

    Object.entries(updates).forEach(([key, value]) => {
      const nameKey = `#${key}`;
      const valueKey = `:${key}`;
      expressionParts.push(`${nameKey} = ${valueKey}`);
      expressionNames[nameKey] = key;
      expressionValues[valueKey] = value;
    });

    // Always update the updated_at timestamp
    expressionParts.push('#updated_at = :updated_at');
    expressionNames['#updated_at'] = 'updated_at';
    expressionValues[':updated_at'] = new Date().toISOString();

    const response = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { user_id: userId },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ConditionExpression: 'attribute_exists(user_id)',
      ReturnValues: 'ALL_NEW',
    }));

    return response.Attributes;
  }

  // Delete a user
  static async delete(userId) {
    const response = await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { user_id: userId },
      ReturnValues: 'ALL_OLD',
    }));

    return response.Attributes || null;
  }

  // List all users with pagination
  static async list({ limit = 20, lastKey = null } = {}) {
    const params = {
      TableName: TABLE_NAME,
      Limit: limit,
    };

    // Support cursor-based pagination
    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(lastKey, 'base64').toString()
      );
    }

    const response = await docClient.send(new ScanCommand(params));

    // Encode the last evaluated key for the next page
    let nextToken = null;
    if (response.LastEvaluatedKey) {
      nextToken = Buffer.from(
        JSON.stringify(response.LastEvaluatedKey)
      ).toString('base64');
    }

    return {
      items: response.Items,
      nextToken,
      count: response.Count,
    };
  }
}

module.exports = UserModel;
```

## Express Routes

Wire up the routes to the model.

```javascript
// src/routes/users.js
const express = require('express');
const UserModel = require('../models/user');

const router = express.Router();

// POST /api/users - Create a new user
router.post('/', async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required',
      });
    }

    const user = await UserModel.create({ name, email });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Get a user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/users - List users with pagination
router.get('/', async (req, res, next) => {
  try {
    const { limit, cursor } = req.query;
    const result = await UserModel.list({
      limit: parseInt(limit) || 20,
      lastKey: cursor || null,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id - Update a user
router.patch('/:id', async (req, res, next) => {
  try {
    const allowedFields = ['name', 'email', 'status'];
    const updates = {};

    // Only allow updating specific fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const user = await UserModel.update(req.params.id, updates);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Delete a user
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await UserModel.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted', user: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

## Error Handling Middleware

Handle DynamoDB-specific errors gracefully.

```javascript
// src/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error(`Error: ${err.name} - ${err.message}`);

  // DynamoDB throttling - tell the client to retry
  if (err.name === 'ProvisionedThroughputExceededException') {
    return res.status(429).json({
      error: 'Too many requests, please retry',
      retryAfter: 1,
    });
  }

  // Conditional check failed - item doesn't exist or version conflict
  if (err.name === 'ConditionalCheckFailedException') {
    return res.status(409).json({
      error: 'Item was modified or does not exist',
    });
  }

  // Validation errors
  if (err.name === 'ValidationException') {
    return res.status(400).json({
      error: 'Invalid request parameters',
      details: err.message,
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
  });
}

module.exports = errorHandler;
```

## Application Entry Point

Tie it all together.

```javascript
// src/app.js
const express = require('express');
const userRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/users', userRoutes);

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
```

```javascript
// index.js
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Testing Your API

Once the server is running, test the endpoints.

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# Get a user
curl http://localhost:3000/api/users/USER_ID_HERE

# List users with pagination
curl "http://localhost:3000/api/users?limit=10"

# Update a user
curl -X PATCH http://localhost:3000/api/users/USER_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson"}'
```

This gives you a clean, well-structured Express.js API backed by DynamoDB. The Document Client handles all the type marshalling, the model layer keeps your DynamoDB logic isolated, and the error middleware translates AWS exceptions into proper HTTP responses.

For monitoring your DynamoDB usage, check out [monitoring DynamoDB with CloudWatch alarms](https://oneuptime.com/blog/post/monitor-dynamodb-with-cloudwatch-alarms/view).
