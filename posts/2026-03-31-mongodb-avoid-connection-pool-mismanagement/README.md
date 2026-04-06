# How to Avoid Connection Pool Mismanagement in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pool, Performance, Anti-Pattern, Configuration

Description: Learn how to configure and manage MongoDB connection pools correctly to avoid connection exhaustion, timeouts, and performance degradation.

---

Connection pool mismanagement is a silent killer of MongoDB application performance. Creating too many connections exhausts server resources. Too few connections create queue buildup and latency spikes. Creating new clients on every request - perhaps the worst mistake - can crash both the application and the database.

## Anti-Pattern 1: Creating a New Client per Request

```javascript
// BAD - creates a new client and connection on every request
app.get('/users/:id', async (req, res) => {
  const client = new MongoClient(uri);  // new connection every time!
  await client.connect();
  const user = await client.db('app').collection('users').findOne({ _id: new ObjectId(req.params.id) });
  await client.close();
  res.json(user);
});
```

Each request opens a new TCP connection to MongoDB, saturates file descriptors, and triggers authentication overhead. Under load, this causes connection storms.

## The Correct Pattern: Shared Client Singleton

Initialize the client once at application startup and reuse it across all requests:

```javascript
// GOOD - single client shared across all requests
const { MongoClient, ObjectId } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI, {
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 10000
});

let db;

async function connectToDatabase() {
  await client.connect();
  db = client.db('myapp');
}

app.get('/users/:id', async (req, res) => {
  const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
  res.json(user);
});

connectToDatabase().then(() => app.listen(3000));
```

## Anti-Pattern 2: Pool Size Too Large

Setting `maxPoolSize` too high wastes MongoDB server resources and can cause connection exhaustion on the database side:

```javascript
// BAD - 500 connections per application instance
const client = new MongoClient(uri, { maxPoolSize: 500 });

// With 10 app replicas: 5,000 connections to MongoDB
// MongoDB Atlas M10 tier supports ~1,500 connections total - CRASH
```

## Calculating the Right Pool Size

Use this formula to set pool size:

```text
maxPoolSize = (server max connections / total app instances) * 0.8

Example:
- Atlas M30 supports 3000 connections
- 20 application pods
- maxPoolSize = (3000 / 20) * 0.8 = 120
```

Set `maxPoolSize` conservatively and monitor `db.serverStatus().connections.current`.

## Anti-Pattern 3: Not Handling Pool Wait Timeouts

When all pool connections are in use, new operations wait. If `waitQueueTimeoutMS` is not set, operations wait indefinitely:

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 20,
  waitQueueTimeoutMS: 2000,  // fail fast if no connection available in 2s
});

// Handle timeout gracefully
try {
  const result = await db.collection('orders').findOne(filter);
} catch (err) {
  if (err.message.includes('timed out')) {
    return res.status(503).json({ error: 'Database busy, try again' });
  }
  throw err;
}
```

## Monitoring Connection Pool Health

Check pool metrics to identify saturation:

```javascript
// In mongosh - check current connection usage
const status = db.serverStatus();
print(`Current connections: ${status.connections.current}`);
print(`Available connections: ${status.connections.available}`);
print(`Total created: ${status.connections.totalCreated}`);

// High totalCreated relative to uptime indicates frequent connect/disconnect cycles
```

## Anti-Pattern 4: Not Closing the Client on Shutdown

Failure to close the client on process exit leaves connections open on the server until they timeout:

```javascript
// GOOD - close client on shutdown
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});
```

## Summary

MongoDB connection pool mismanagement - creating clients per request, oversized pools, and unhandled pool timeouts - causes some of the most severe production performance problems. Use a single client singleton per process, calculate pool size based on your Atlas tier and replica count, configure `waitQueueTimeoutMS` to fail fast under load, and always close the client gracefully on shutdown.
