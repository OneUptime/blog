# How to Manage MongoDB Connections in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pooling, Node.js, Performance, Database, Best Practices

Description: Learn best practices for managing MongoDB connections in applications including connection pooling, handling reconnections, proper connection lifecycle management, and avoiding common pitfalls.

---

Proper MongoDB connection management is crucial for application performance, reliability, and resource efficiency. Poorly managed connections lead to connection leaks, timeouts, and degraded performance. This guide covers everything you need to know about handling MongoDB connections correctly.

## Understanding MongoDB Connections

A MongoDB connection involves:

```mermaid
graph LR
    A[Application] --> B[Connection Pool]
    B --> C[Socket 1]
    B --> D[Socket 2]
    B --> E[Socket N]
    C --> F[MongoDB Server]
    D --> F
    E --> F
```

The MongoDB driver maintains a connection pool - a set of reusable socket connections to the database. Understanding this architecture is key to proper connection management.

## Connection Pool Basics

### Default Pool Behavior

The MongoDB Node.js driver uses connection pooling by default:

```javascript
const { MongoClient } = require('mongodb');

// Default pool size is 100 connections
const client = new MongoClient('mongodb://localhost:27017');

// This creates a pool, not a single connection
await client.connect();
```

### Configuring Pool Size

Adjust pool size based on your application's concurrency needs:

```javascript
const client = new MongoClient('mongodb://localhost:27017', {
  // Maximum number of connections in the pool
  maxPoolSize: 50,

  // Minimum number of connections to maintain
  minPoolSize: 5,

  // Maximum time a connection can be idle before being removed
  maxIdleTimeMS: 60000,

  // Maximum time to wait for a connection from the pool
  waitQueueTimeoutMS: 5000
});
```

## The Golden Rule: One Connection Per Application

The most important connection management principle:

```javascript
// BAD - Creating new connection for each request
app.get('/users', async (req, res) => {
  const client = new MongoClient(uri);  // Don't do this!
  await client.connect();
  const users = await client.db('app').collection('users').find().toArray();
  await client.close();
  res.json(users);
});

// GOOD - Reuse single connection
const client = new MongoClient(uri);
let db;

async function initializeDatabase() {
  await client.connect();
  db = client.db('app');
}

app.get('/users', async (req, res) => {
  const users = await db.collection('users').find().toArray();
  res.json(users);
});
```

## Connection Patterns

### Singleton Pattern (Node.js)

Create a reusable database module:

```javascript
// db.js
const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect(uri, dbName) {
  if (db) return db;

  client = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 5
  });

  await client.connect();
  db = client.db(dbName);

  console.log('Connected to MongoDB');
  return db;
}

async function disconnect() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Disconnected from MongoDB');
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connect() first.');
  }
  return db;
}

module.exports = { connect, disconnect, getDb };
```

Usage:

```javascript
// app.js
const express = require('express');
const { connect, getDb, disconnect } = require('./db');

const app = express();

app.get('/users', async (req, res) => {
  const users = await getDb().collection('users').find().toArray();
  res.json(users);
});

async function start() {
  await connect(process.env.MONGODB_URI, 'myapp');
  app.listen(3000, () => console.log('Server running'));
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

start();
```

### Dependency Injection Pattern

For larger applications:

```javascript
// database.js
class Database {
  constructor(uri, dbName, options = {}) {
    this.uri = uri;
    this.dbName = dbName;
    this.options = {
      maxPoolSize: 50,
      minPoolSize: 5,
      ...options
    };
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (this.db) return this.db;

    this.client = new MongoClient(this.uri, this.options);
    await this.client.connect();
    this.db = this.client.db(this.dbName);

    return this.db;
  }

  getCollection(name) {
    if (!this.db) throw new Error('Not connected');
    return this.db.collection(name);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

module.exports = Database;
```

```javascript
// userService.js
class UserService {
  constructor(database) {
    this.db = database;
  }

  async findAll() {
    return this.db.getCollection('users').find().toArray();
  }

  async findById(id) {
    return this.db.getCollection('users').findOne({ _id: id });
  }
}

module.exports = UserService;
```

```javascript
// app.js
const Database = require('./database');
const UserService = require('./userService');

const db = new Database(process.env.MONGODB_URI, 'myapp');
const userService = new UserService(db);

// Initialize and use
await db.connect();
const users = await userService.findAll();
```

## Handling Connection Events

Monitor connection health with events:

```javascript
const client = new MongoClient(uri);

// Connection opened
client.on('connectionPoolCreated', (event) => {
  console.log('Connection pool created');
});

// New connection added to pool
client.on('connectionCreated', (event) => {
  console.log('Connection created:', event.connectionId);
});

// Connection checked out from pool
client.on('connectionCheckedOut', (event) => {
  console.log('Connection checked out:', event.connectionId);
});

// Connection returned to pool
client.on('connectionCheckedIn', (event) => {
  console.log('Connection checked in:', event.connectionId);
});

// Connection closed
client.on('connectionClosed', (event) => {
  console.log('Connection closed:', event.connectionId, event.reason);
});

// Server heartbeat
client.on('serverHeartbeatSucceeded', (event) => {
  console.log('Heartbeat succeeded:', event.connectionId);
});

client.on('serverHeartbeatFailed', (event) => {
  console.error('Heartbeat failed:', event.failure);
});

await client.connect();
```

## Automatic Reconnection

The MongoDB driver handles reconnection automatically, but configure it properly:

```javascript
const client = new MongoClient(uri, {
  // Reconnection settings
  retryWrites: true,
  retryReads: true,

  // Server selection timeout (how long to try connecting)
  serverSelectionTimeoutMS: 30000,

  // Socket timeout
  socketTimeoutMS: 45000,

  // Connection timeout
  connectTimeoutMS: 30000,

  // Heartbeat frequency to check server status
  heartbeatFrequencyMS: 10000
});
```

## Connection Strings for Different Environments

### Local Development

```javascript
const uri = 'mongodb://localhost:27017/myapp';
```

### Replica Set

```javascript
const uri = 'mongodb://host1:27017,host2:27017,host3:27017/myapp?replicaSet=myReplicaSet';
```

### MongoDB Atlas

```javascript
const uri = 'mongodb+srv://username:password@cluster.mongodb.net/myapp?retryWrites=true&w=majority';
```

### With Authentication

```javascript
const uri = 'mongodb://username:password@localhost:27017/myapp?authSource=admin';
```

## Mongoose Connection Management

Mongoose provides its own connection management:

```javascript
const mongoose = require('mongoose');

// Basic connection
await mongoose.connect('mongodb://localhost:27017/myapp', {
  maxPoolSize: 50,
  minPoolSize: 5
});

// Connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
```

### Mongoose Multiple Connections

```javascript
// Multiple database connections with Mongoose
const conn1 = mongoose.createConnection('mongodb://localhost/db1');
const conn2 = mongoose.createConnection('mongodb://localhost/db2');

const UserModel = conn1.model('User', userSchema);
const ProductModel = conn2.model('Product', productSchema);
```

## Connection in Serverless Environments

Serverless functions require special handling:

```javascript
// AWS Lambda / Vercel / Netlify Functions
const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 10,  // Lower for serverless
    minPoolSize: 1,
    maxIdleTimeMS: 10000,
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();

  cachedClient = client;
  cachedDb = client.db(process.env.DB_NAME);

  return { client: cachedClient, db: cachedDb };
}

// Lambda handler
exports.handler = async (event) => {
  const { db } = await connectToDatabase();

  const users = await db.collection('users').find().toArray();

  return {
    statusCode: 200,
    body: JSON.stringify(users)
  };
};
```

## Common Mistakes and Solutions

### Mistake 1: Opening Connection Per Request

```javascript
// BAD
async function getUsers() {
  const client = await MongoClient.connect(uri);
  const users = await client.db('app').collection('users').find().toArray();
  await client.close();  // Resource leak if error occurs before this
  return users;
}

// GOOD
const client = new MongoClient(uri);
await client.connect();

async function getUsers() {
  return client.db('app').collection('users').find().toArray();
}
```

### Mistake 2: Not Handling Connection Errors

```javascript
// BAD
const client = new MongoClient(uri);
await client.connect();  // Crashes if connection fails

// GOOD
const client = new MongoClient(uri);
try {
  await client.connect();
  console.log('Connected to MongoDB');
} catch (error) {
  console.error('Failed to connect:', error);
  process.exit(1);
}
```

### Mistake 3: Pool Exhaustion

```javascript
// BAD - Checking out connections without releasing
for (let i = 0; i < 1000; i++) {
  const session = client.startSession();
  // Forgot to end session - connections leak
}

// GOOD - Always release connections
for (let i = 0; i < 1000; i++) {
  const session = client.startSession();
  try {
    // Do work
  } finally {
    session.endSession();  // Always release
  }
}
```

### Mistake 4: Not Gracefully Shutting Down

```javascript
// BAD - Connections left dangling
process.on('SIGTERM', () => process.exit(0));

// GOOD - Close connections before exit
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Monitoring Connection Health

### Health Check Endpoint

```javascript
app.get('/health', async (req, res) => {
  try {
    // Ping the database
    await client.db('admin').command({ ping: 1 });

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

### Connection Pool Metrics

```javascript
// Get pool statistics
function getPoolStats() {
  const topology = client.topology;

  if (!topology) return null;

  const servers = topology.s.servers;
  const stats = [];

  for (const [address, server] of servers) {
    stats.push({
      address,
      pool: {
        totalConnections: server.s.pool.totalConnectionCount,
        availableConnections: server.s.pool.availableConnectionCount,
        pendingConnections: server.s.pool.pendingConnectionCount
      }
    });
  }

  return stats;
}

// Expose in monitoring endpoint
app.get('/metrics/connections', (req, res) => {
  res.json(getPoolStats());
});
```

## Summary

Effective MongoDB connection management follows these principles:

1. **Use connection pooling** - Never create new connections per request
2. **Single connection per application** - Initialize once, reuse everywhere
3. **Configure pool size appropriately** - Match your concurrency needs
4. **Handle errors and reconnection** - Build resilience into your connection logic
5. **Graceful shutdown** - Always close connections when application stops
6. **Monitor connection health** - Track pool usage and connection events
7. **Adapt for serverless** - Cache connections between function invocations

Following these practices ensures your application uses MongoDB connections efficiently, handles failures gracefully, and scales appropriately with your workload.
