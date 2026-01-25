# How to Configure Connection Pooling for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pooling, Database, Performance, Node.js

Description: Learn how to configure MongoDB connection pooling to improve application performance, reduce latency, and handle high traffic loads efficiently with practical code examples.

---

Every time your application opens a new connection to MongoDB, it incurs a cost: TCP handshakes, authentication, and TLS negotiation all add up. In high-traffic applications, creating a new connection per request can tank your performance. Connection pooling solves this by maintaining a set of reusable connections that your application can borrow and return.

## Why Connection Pooling Matters

Without connection pooling, each database operation follows this expensive pattern:

1. Open TCP connection to MongoDB
2. Complete TLS handshake (if enabled)
3. Authenticate with credentials
4. Execute the query
5. Close the connection

With a pool, steps 1-3 happen once per connection, and that connection gets reused for thousands of operations.

## Default Pool Settings in MongoDB Drivers

Most MongoDB drivers come with sensible defaults, but understanding them helps you tune for your workload.

```javascript
// Node.js MongoDB driver default settings
const { MongoClient } = require('mongodb');

// The driver creates a pool with these defaults:
// - maxPoolSize: 100 (maximum connections per server)
// - minPoolSize: 0 (minimum connections maintained)
// - maxIdleTimeMS: 0 (connections never expire when idle)
// - waitQueueTimeoutMS: 0 (wait indefinitely for connection)

const client = new MongoClient('mongodb://localhost:27017/mydb');
```

## Configuring Pool Size for Your Workload

The right pool size depends on your application's concurrency requirements and MongoDB server capacity.

```javascript
const { MongoClient } = require('mongodb');

// Production-ready connection pool configuration
const client = new MongoClient('mongodb://localhost:27017/mydb', {
  // Maximum connections this client can create to each server
  // Rule of thumb: start with (CPU cores * 2) + number of disks
  maxPoolSize: 50,

  // Minimum connections to keep open even when idle
  // Prevents cold start latency during traffic spikes
  minPoolSize: 10,

  // Close idle connections after 30 seconds
  // Helps release resources during low-traffic periods
  maxIdleTimeMS: 30000,

  // Maximum time to wait for a connection from the pool
  // Fail fast instead of hanging when pool is exhausted
  waitQueueTimeoutMS: 5000,

  // Maximum number of operations waiting for a connection
  // Prevents unbounded memory growth under extreme load
  maxWaitQueueSize: 500
});

async function connectWithPooling() {
  try {
    await client.connect();
    console.log('Connected with pool settings:', {
      maxPoolSize: 50,
      minPoolSize: 10
    });

    // Your application code here
    const db = client.db('mydb');
    const collection = db.collection('users');

    // Each operation borrows a connection from the pool
    // and returns it when done
    const user = await collection.findOne({ email: 'test@example.com' });

  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

## Monitoring Pool Health

Track pool metrics to understand connection usage patterns and identify bottlenecks.

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017/mydb', {
  maxPoolSize: 50,
  minPoolSize: 5,
  // Enable connection pool monitoring
  monitorCommands: true
});

// Listen for pool events to track connection lifecycle
client.on('connectionPoolCreated', (event) => {
  console.log('Pool created for:', event.address);
});

client.on('connectionCreated', (event) => {
  console.log('New connection added to pool:', event.connectionId);
});

client.on('connectionCheckOutStarted', (event) => {
  // A request is waiting for a connection
  // High frequency here may indicate pool is too small
  console.log('Checkout started at:', new Date().toISOString());
});

client.on('connectionCheckedOut', (event) => {
  console.log('Connection borrowed:', event.connectionId);
});

client.on('connectionCheckedIn', (event) => {
  console.log('Connection returned:', event.connectionId);
});

client.on('connectionPoolClosed', (event) => {
  console.log('Pool closed for:', event.address);
});

// Track pool statistics programmatically
async function getPoolStats() {
  // Access internal pool statistics (driver-specific)
  const topology = client.topology;
  if (topology) {
    const servers = topology.s.servers;
    for (const [address, server] of servers) {
      const pool = server.s.pool;
      console.log(`Pool stats for ${address}:`, {
        totalConnections: pool.totalConnectionCount,
        availableConnections: pool.availableConnectionCount,
        pendingConnections: pool.pendingConnectionCount
      });
    }
  }
}
```

## Connection Pool Settings for Replica Sets

When connecting to a replica set, the driver creates separate pools for each member.

```javascript
const { MongoClient } = require('mongodb');

// Replica set connection with per-member pool settings
const client = new MongoClient(
  'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/mydb?replicaSet=rs0',
  {
    // These settings apply per server, not total
    // With 3 nodes: up to 150 total connections (50 * 3)
    maxPoolSize: 50,
    minPoolSize: 5,

    // Read from secondaries to distribute load
    readPreference: 'secondaryPreferred',

    // Write concern for durability
    w: 'majority',

    // Socket timeout for operations
    socketTimeoutMS: 30000,

    // Server selection timeout
    serverSelectionTimeoutMS: 10000
  }
);
```

## Python Connection Pool Configuration

```python
from pymongo import MongoClient
from pymongo.pool import PoolOptions

# Python driver pool configuration
client = MongoClient(
    'mongodb://localhost:27017/mydb',
    # Maximum connections per server
    maxPoolSize=50,
    # Minimum connections to maintain
    minPoolSize=10,
    # Maximum time (ms) connection can remain idle before closing
    maxIdleTimeMS=30000,
    # Maximum time (ms) to wait for connection from pool
    waitQueueTimeoutMS=5000,
    # Enable connection pool events
    event_listeners=None  # Add custom listeners here
)

# Use context manager for clean connection handling
def query_with_pool():
    db = client.mydb
    collection = db.users

    # Connection is automatically borrowed and returned
    result = collection.find_one({'email': 'test@example.com'})
    return result

# Check server status including connection info
def check_connection_status():
    server_status = client.admin.command('serverStatus')
    connections = server_status.get('connections', {})
    print(f"Current connections: {connections.get('current', 0)}")
    print(f"Available connections: {connections.get('available', 0)}")
    print(f"Total created: {connections.get('totalCreated', 0)}")
```

## Calculating Optimal Pool Size

The ideal pool size depends on several factors:

```javascript
// Formula for calculating pool size:
// maxPoolSize = (Average concurrent requests) * (Average query time in seconds) * 1.5

// Example calculation:
// - 1000 requests per second
// - Average query time: 50ms (0.05 seconds)
// - Concurrent operations: 1000 * 0.05 = 50
// - With 50% headroom: 50 * 1.5 = 75 connections

const calculatePoolSize = (requestsPerSecond, avgQueryTimeMs, headroomFactor = 1.5) => {
  const avgQueryTimeSec = avgQueryTimeMs / 1000;
  const concurrentOps = requestsPerSecond * avgQueryTimeSec;
  return Math.ceil(concurrentOps * headroomFactor);
};

// Usage
const poolSize = calculatePoolSize(1000, 50);
console.log(`Recommended pool size: ${poolSize}`); // 75
```

## Common Pool Configuration Mistakes

**Setting pool size too high**: More connections consume memory on both client and server. MongoDB limits total connections (default: 65536). If 100 app instances each use 100 connections, you hit limits fast.

**Ignoring waitQueueTimeoutMS**: Without a timeout, requests hang indefinitely when the pool is exhausted. Always set a reasonable timeout and handle the error.

**Not setting minPoolSize**: Cold starts after idle periods cause latency spikes. Set minPoolSize to handle baseline traffic immediately.

```javascript
// Handling pool exhaustion gracefully
async function queryWithTimeout(collection, query) {
  try {
    return await collection.findOne(query);
  } catch (error) {
    if (error.name === 'MongoPoolClearedError' ||
        error.message.includes('connection pool')) {
      // Pool exhausted - implement backoff or circuit breaker
      console.error('Pool exhausted, retrying after delay');
      await new Promise(resolve => setTimeout(resolve, 100));
      return await collection.findOne(query);
    }
    throw error;
  }
}
```

## Testing Pool Configuration

Before deploying pool changes, load test to verify behavior.

```javascript
// Simple load test for pool configuration
const { MongoClient } = require('mongodb');

async function loadTestPool(concurrency, iterations) {
  const client = new MongoClient('mongodb://localhost:27017/test', {
    maxPoolSize: 20,
    waitQueueTimeoutMS: 1000
  });

  await client.connect();
  const collection = client.db('test').collection('loadtest');

  const startTime = Date.now();
  let completed = 0;
  let errors = 0;

  // Create concurrent operations
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(
      (async () => {
        for (let j = 0; j < iterations; j++) {
          try {
            await collection.findOne({ _id: i });
            completed++;
          } catch (e) {
            errors++;
          }
        }
      })()
    );
  }

  await Promise.all(promises);

  const duration = Date.now() - startTime;
  console.log(`Completed: ${completed}, Errors: ${errors}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Throughput: ${(completed / duration * 1000).toFixed(0)} ops/sec`);

  await client.close();
}

// Run with 100 concurrent operations, 100 iterations each
loadTestPool(100, 100);
```

## Summary

Connection pooling is essential for MongoDB performance at scale. Start with conservative settings, monitor pool metrics, and adjust based on actual workload patterns. Remember that pool size affects both client memory and server connection limits, so balance accordingly.

Key takeaways:
- Set `maxPoolSize` based on concurrent operation requirements
- Use `minPoolSize` to avoid cold start latency
- Always configure `waitQueueTimeoutMS` to fail fast under extreme load
- Monitor pool events to identify bottlenecks before they become outages
