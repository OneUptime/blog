# How to Build a REST API with MongoDB and Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Express.js, Node.js, REST API, Backend Development

Description: Learn how to build a production-ready REST API using Node.js, Express.js, and MongoDB with proper routing, validation, error handling, and pagination.

---

## Project Setup

Initialize the project and install dependencies:

```bash
mkdir mongo-express-api && cd mongo-express-api
npm init -y
npm install express mongodb dotenv
npm install --save-dev nodemon
```

Create a `.env` file:

```text
MONGODB_URI=mongodb://localhost:27017
DB_NAME=myapp
PORT=3000
```

## Connecting to MongoDB

```javascript
// db.js
const { MongoClient } = require('mongodb');

let db;

async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.DB_NAME);
  console.log('Connected to MongoDB');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { connectDB, getDB };
```

## Express App Entry Point

```javascript
// app.js
require('dotenv').config();
const express = require('express');
const { connectDB } = require('./db');
const usersRouter = require('./routes/users');

const app = express();
app.use(express.json());

app.use('/api/users', usersRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

async function start() {
  await connectDB();
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

start();
```

## CRUD Routes

```javascript
// routes/users.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');

const router = express.Router();

// GET /api/users - list users with pagination
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.collection('users').find({}).skip(skip).limit(limit).toArray(),
      db.collection('users').countDocuments(),
    ]);

    res.json({
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - get single user
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/users - create user
router.post('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const result = await db.collection('users').insertOne({
      name,
      email,
      createdAt: new Date(),
    });

    res.status(201).json({ _id: result.insertedId, name, email });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(err);
  }
});

// PATCH /api/users/:id - update user
router.patch('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const { name, email } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('users').deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

## Creating an Index

```javascript
// Run once during app startup or in a migration script
async function createIndexes() {
  const db = getDB();
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ createdAt: -1 });
  console.log('Indexes created');
}
```

## Testing the API

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# List users
curl "http://localhost:3000/api/users?page=1&limit=10"

# Get single user
curl http://localhost:3000/api/users/64abc123def4567890123456

# Update user
curl -X PATCH http://localhost:3000/api/users/64abc123def4567890123456 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith"}'

# Delete user
curl -X DELETE http://localhost:3000/api/users/64abc123def4567890123456
```

## Summary

Building a REST API with MongoDB and Express.js involves connecting with the official MongoDB Node.js driver, defining routes for CRUD operations, and handling errors including duplicate key violations and missing resources. Adding indexes on frequently queried fields and using pagination prevents performance issues as data grows.
