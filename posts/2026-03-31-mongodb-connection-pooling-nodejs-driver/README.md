# How to Use Connection Pooling in the MongoDB Node.js Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Node.js, Connection Pool, Performance, Driver

Description: Learn how to configure and optimize connection pooling in the MongoDB Node.js driver to improve throughput and reduce latency in production apps.

---

## Overview

Connection pooling reuses existing database connections rather than creating a new one for every operation. The MongoDB Node.js driver manages a pool automatically, but tuning its settings is essential for high-throughput applications.

## Default Pool Behavior

By default, the driver creates a pool of up to 100 connections per `MongoClient` instance. You should create a single `MongoClient` and reuse it throughout your application.

```javascript
const { MongoClient } = require('mongodb');

// Single instance shared across your app
const client = new MongoClient('mongodb://localhost:27017', {
  maxPoolSize: 100, // default
  minPoolSize: 0
});

async function connect() {
  await client.connect();
  return client;
}

module.exports = { client, connect };
```

## Configuring Pool Size

Adjust `maxPoolSize` and `minPoolSize` based on your workload:

```javascript
const client = new MongoClient('mongodb://localhost:27017', {
  maxPoolSize: 50,       // max concurrent connections
  minPoolSize: 5,        // keep at least 5 connections alive
  maxIdleTimeMS: 60000,  // close idle connections after 60s
  waitQueueTimeoutMS: 5000 // error if no connection available in 5s
});
```

## Pool Events for Monitoring

The driver emits connection pool events you can listen to for observability:

```javascript
client.on('connectionPoolCreated', (event) => {
  console.log('Pool created:', event.address);
});

client.on('connectionCheckedOut', (event) => {
  console.log('Connection checked out from pool');
});

client.on('connectionCheckedIn', (event) => {
  console.log('Connection returned to pool');
});

client.on('connectionPoolClosed', (event) => {
  console.log('Pool closed:', event.address);
});
```

## Using the Pool in an Express App

Share the client singleton across request handlers:

```javascript
const express = require('express');
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI, { maxPoolSize: 20 });
const app = express();

app.get('/users', async (req, res) => {
  const db = client.db('mydb');
  const users = await db.collection('users').find().toArray();
  res.json(users);
});

async function start() {
  await client.connect();
  app.listen(3000);
}
start();
```

## Verifying Pool Usage

Use the `currentOp` admin command to see active connections:

```javascript
const admin = client.db('admin');
const ops = await admin.command({ currentOp: 1 });
console.log('Active operations:', ops.inprog.length);
```

## Best Practices

- Use a single `MongoClient` instance per process - never create one per request.
- Set `maxPoolSize` based on your MongoDB server's connection limit divided by the number of app instances.
- Use `minPoolSize` to pre-warm connections on startup and reduce cold-start latency.
- Set `waitQueueTimeoutMS` to fail fast when the pool is exhausted rather than hanging indefinitely.

## Summary

The MongoDB Node.js driver handles connection pooling automatically through the `MongoClient`. Tune `maxPoolSize`, `minPoolSize`, `maxIdleTimeMS`, and `waitQueueTimeoutMS` to match your workload. Always use a single shared client instance and monitor pool events for production observability.
