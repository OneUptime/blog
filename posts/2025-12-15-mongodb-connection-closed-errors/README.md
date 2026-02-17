# How to Fix 'connection closed' Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database, Troubleshooting, Connection Management, DevOps

Description: Learn how to diagnose and fix MongoDB 'connection closed' errors caused by network issues, timeouts, connection pool exhaustion, and server-side disconnections with practical solutions and code examples.

---

The "connection closed" error in MongoDB is one of the most frustrating issues to debug because it can stem from multiple sources - network problems, server overload, misconfigured connection pools, or application bugs. This guide walks you through identifying the root cause and implementing robust solutions.

## Understanding Connection Closed Errors

When MongoDB closes a connection unexpectedly, your application receives an error like:

```
MongoNetworkError: connection closed
Error: connection 1 to localhost:27017 closed
MongoError: Topology was destroyed
```

These errors typically occur when:

1. The MongoDB server closes idle connections
2. Network interruptions break the TCP connection
3. The server is overloaded and drops connections
4. Connection pool settings are misconfigured
5. Firewalls or load balancers terminate idle connections

```mermaid
flowchart TD
    A[Application] -->|Connection Request| B{Connection Pool}
    B -->|Healthy Connection| C[MongoDB Server]
    B -->|Stale Connection| D[Connection Closed Error]

    C -->|Idle Timeout| E[Server Closes Connection]
    C -->|Network Issue| F[TCP Connection Breaks]
    C -->|Server Overload| G[Connection Rejected]

    E --> D
    F --> D
    G --> D

    D -->|Retry Logic| B
```

## Common Causes and Solutions

### 1. Idle Connection Timeout

MongoDB servers close connections that have been idle for too long. By default, this timeout is often set by the operating system or mongod configuration.

**Solution: Configure Connection Pool Keep-Alive**

```javascript
// Node.js with MongoDB driver
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017/mydb', {
  // Send keep-alive probes to prevent idle disconnections
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,

  // Connection pool settings
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,

  // Enable server monitoring
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000
});

async function connect() {
  try {
    await client.connect();
    console.log('Connected successfully');
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

For Python applications:

```python
from pymongo import MongoClient

client = MongoClient(
    'mongodb://localhost:27017/mydb',
    # Connection pool settings
    maxPoolSize=50,
    minPoolSize=5,
    maxIdleTimeMS=30000,

    # Timeout settings
    socketTimeoutMS=45000,
    connectTimeoutMS=10000,
    serverSelectionTimeoutMS=30000,

    # Keep-alive settings
    socketKeepAlive=True,
    heartbeatFrequencyMS=10000
)
```

### 2. Connection Pool Exhaustion

When all connections in the pool are in use and a new operation needs a connection, you may experience timeouts or connection errors.

**Solution: Monitor and Adjust Pool Size**

```javascript
// Monitor connection pool events
client.on('connectionPoolCreated', (event) => {
  console.log(`Pool created for ${event.address}`);
});

client.on('connectionPoolClosed', (event) => {
  console.log(`Pool closed for ${event.address}`);
});

client.on('connectionCheckedOut', (event) => {
  console.log(`Connection checked out: ${event.connectionId}`);
});

client.on('connectionCheckOutFailed', (event) => {
  console.error(`Checkout failed: ${event.reason}`);
});

// Check pool status programmatically
const admin = client.db('admin');
const serverStatus = await admin.command({ serverStatus: 1 });
console.log('Current connections:', serverStatus.connections);
```

### 3. Network Timeouts and Firewalls

Load balancers, firewalls, and NAT devices often close idle TCP connections after a certain period (commonly 60-300 seconds).

**Solution: Configure TCP Keep-Alive at the OS Level**

```bash
# Linux - Set TCP keep-alive parameters
sudo sysctl -w net.ipv4.tcp_keepalive_time=120
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=30
sudo sysctl -w net.ipv4.tcp_keepalive_probes=3

# Make changes permanent
echo "net.ipv4.tcp_keepalive_time=120" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_intvl=30" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_probes=3" >> /etc/sysctl.conf
```

### 4. Replica Set Failover

During replica set elections, connections to the old primary are closed.

**Solution: Implement Retry Logic**

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017/mydb', {
  // Enable retryable writes and reads
  retryWrites: true,
  retryReads: true,

  // Replica set settings
  replicaSet: 'rs0',
  readPreference: 'primaryPreferred',

  // Allow time for failover
  serverSelectionTimeoutMS: 30000
});

// Implement application-level retry
async function executeWithRetry(operation, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (isRetryableError(error) && attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await sleep(Math.pow(2, attempt) * 100); // Exponential backoff
        continue;
      }

      throw error;
    }
  }
}

function isRetryableError(error) {
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'MongoNetworkError',
    'MongoNetworkTimeoutError'
  ];

  return retryableCodes.some(code =>
    error.name?.includes(code) ||
    error.message?.includes(code)
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 5. Server Resource Limits

MongoDB servers have connection limits. When exceeded, new connections are rejected.

**Solution: Monitor and Increase Limits**

```javascript
// Check current connection limits
const admin = client.db('admin');
const result = await admin.command({ serverStatus: 1 });

console.log('Connection stats:');
console.log('  Current:', result.connections.current);
console.log('  Available:', result.connections.available);
console.log('  Total created:', result.connections.totalCreated);

// In mongod.conf, increase max connections
// net:
//   maxIncomingConnections: 65536
```

## Monitoring Connection Health

Implement comprehensive connection monitoring:

```javascript
class MongoConnectionMonitor {
  constructor(client) {
    this.client = client;
    this.metrics = {
      checkouts: 0,
      checkins: 0,
      failures: 0,
      closed: 0
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.client.on('connectionCheckedOut', () => {
      this.metrics.checkouts++;
    });

    this.client.on('connectionCheckedIn', () => {
      this.metrics.checkins++;
    });

    this.client.on('connectionCheckOutFailed', (event) => {
      this.metrics.failures++;
      console.error('Connection checkout failed:', event.reason);
    });

    this.client.on('connectionClosed', (event) => {
      this.metrics.closed++;
      console.warn('Connection closed:', event.reason);
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.metrics.checkouts - this.metrics.checkins
    };
  }

  async healthCheck() {
    try {
      const admin = this.client.db('admin');
      await admin.command({ ping: 1 });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

// Usage
const monitor = new MongoConnectionMonitor(client);
setInterval(() => {
  console.log('Connection metrics:', monitor.getMetrics());
}, 30000);
```

## Connection String Best Practices

Use a properly configured connection string:

```
mongodb://user:password@host1:27017,host2:27017,host3:27017/database?
  replicaSet=rs0&
  retryWrites=true&
  retryReads=true&
  maxPoolSize=50&
  minPoolSize=5&
  maxIdleTimeMS=30000&
  socketTimeoutMS=45000&
  connectTimeoutMS=10000&
  serverSelectionTimeoutMS=30000&
  heartbeatFrequencyMS=10000&
  readPreference=primaryPreferred
```

## Debugging Connection Issues

Enable driver-level debugging to identify the root cause:

```javascript
// Enable verbose logging
const client = new MongoClient(uri, {
  monitorCommands: true,
  loggerLevel: 'debug'
});

client.on('commandStarted', (event) => {
  console.log('Command started:', event.commandName);
});

client.on('commandSucceeded', (event) => {
  console.log('Command succeeded:', event.commandName, event.duration, 'ms');
});

client.on('commandFailed', (event) => {
  console.error('Command failed:', event.commandName, event.failure);
});
```

## Summary

Connection closed errors in MongoDB require a multi-faceted approach:

1. **Configure proper timeouts** - Set socket, connection, and server selection timeouts appropriately
2. **Tune connection pools** - Adjust pool size based on your workload
3. **Enable keep-alive** - Prevent idle connection termination by firewalls
4. **Implement retry logic** - Handle transient failures gracefully
5. **Monitor actively** - Track connection metrics and set up alerts
6. **Check server limits** - Ensure MongoDB can handle your connection count

With these strategies in place, your application will be resilient to connection issues and recover gracefully from temporary network problems.
