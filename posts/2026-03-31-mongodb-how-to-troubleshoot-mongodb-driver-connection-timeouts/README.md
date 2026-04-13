# How to Troubleshoot MongoDB Driver Connection Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Timeout, Driver, Connection Pool, Troubleshooting

Description: Learn how to diagnose and fix MongoDB driver connection timeouts by tuning pool settings, understanding timeout types, and resolving network issues.

---

## Types of MongoDB Connection Timeouts

MongoDB drivers expose several distinct timeout settings:

```text
connectTimeoutMS     - time to establish the initial TCP connection
socketTimeoutMS      - time for a read/write operation to complete
serverSelectionTimeoutMS - time to find an available server in the topology
connectionTimeoutMS  - alias for connectTimeoutMS in some drivers
maxTimeMS            - per-operation timeout on the server side
waitQueueTimeoutMS   - time to wait for a connection from the pool
```

## Reading the Timeout Error

Different errors point to different problems:

```text
"connection timed out"
  -> connectTimeoutMS exceeded, cannot reach the server

"server selection timed out after 30000 ms"
  -> serverSelectionTimeoutMS exceeded, no suitable server found

"MongoNetworkError: connection to ... closed"
  -> socketTimeoutMS exceeded during an operation

"Timed out while checking out a connection from connection pool"
  -> waitQueueTimeoutMS exceeded, pool is exhausted

"operation exceeded time limit"  (code 50)
  -> maxTimeMS exceeded on the server side
```

## Checking Connection Pool Status

```javascript
// Node.js: listen to connection pool events
const client = new MongoClient(uri)

client.on("connectionPoolCreated", event => {
  console.log("Pool created:", event)
})

client.on("connectionCheckedOut", event => {
  // Track how often connections are checked out
})

client.on("connectionCheckOutFailed", event => {
  console.error("Pool checkout failed:", event.reason, event)
})

// Get current pool stats via serverStatus
const admin = client.db().admin()
const status = await admin.command({ serverStatus: 1 })
const stats = status.connections
console.log("Current connections:", stats.current)
console.log("Available connections:", stats.available)
console.log("Total created:", stats.totalCreated)
```

## Connection Pool Configuration

Tune pool settings based on your workload:

```javascript
const client = new MongoClient(uri, {
  // Maximum connections in the pool per host
  maxPoolSize: 50,           // default: 100

  // Minimum connections to keep ready
  minPoolSize: 5,            // default: 0

  // How long to wait for a connection from the pool
  waitQueueTimeoutMS: 10000, // default: 0 (wait indefinitely)

  // How long to allow an idle connection to remain in the pool
  maxIdleTimeMS: 60000,      // default: 0 (never close idle)

  // TCP connection timeout
  connectTimeoutMS: 10000,   // default: 30000

  // Time to find a server in the topology
  serverSelectionTimeoutMS: 30000  // default: 30000
})
```

## Diagnosing Connection Exhaustion

Connection exhaustion (pool full, waiting for connections) is a common cause of timeout cascades:

```javascript
// Monitor current connections on the MongoDB server
db.adminCommand({ serverStatus: 1 }).connections
/*
{
  current: 498,          // currently connected clients
  available: 2,          // remaining capacity
  totalCreated: 15283
}
*/

// Default maxIncomingConnections is 65536 (not the bottleneck usually)
// The bottleneck is usually maxPoolSize on the driver side

// If current connections approaches your maxPoolSize * numAppInstances,
// you have a connection exhaustion problem
```

Symptoms of connection exhaustion:
- `waitQueueTimeoutMS` errors in application logs
- High `connections.current` on the server
- Latency spikes coinciding with traffic spikes

## Fixing Connection Exhaustion

```javascript
// Option 1: Increase maxPoolSize (if server can handle more connections)
const client = new MongoClient(uri, { maxPoolSize: 200 })

// Option 2: Reduce connection hold time in application code
// WRONG: holding connection open during external API call
async function processOrder(orderId) {
  const session = client.startSession()
  const order = await db.collection("orders").findOne({ _id: orderId }, { session })
  await callExternalPaymentAPI(order)  // holds connection during external call
  await db.collection("orders").updateOne({ _id: orderId }, { $set: { paid: true } }, { session })
  session.endSession()
}

// BETTER: release connection between operations
async function processOrder(orderId) {
  const order = await db.collection("orders").findOne({ _id: orderId })
  // Connection released here ^

  const paymentResult = await callExternalPaymentAPI(order)
  // Connection re-acquired here v

  await db.collection("orders").updateOne({ _id: orderId }, { $set: { paid: true } })
}
```

## Diagnosing Network Issues

```bash
# Test TCP connectivity to MongoDB port
telnet mongodb-host 27017
nc -zv mongodb-host 27017

# Check for packet loss
ping -c 100 mongodb-host
mtr mongodb-host

# Check for firewall or security group blocking
# In AWS, verify security group allows inbound 27017 from app server IP
# Check Atlas IP access list

# Verify DNS resolution
nslookup mongodb-host
dig mongodb-host
```

## Server-Side maxTimeMS

Use `maxTimeMS` to cap individual operation time on the server:

```javascript
// This operation will abort after 5 seconds on the server
const result = await db.collection("largeCollection").find(
  { status: "pending" },
  { maxTimeMS: 5000 }
).toArray()

// For aggregations
const results = await db.collection("events").aggregate(
  [...pipeline],
  { maxTimeMS: 10000 }
).toArray()
```

## Implementing Retry Logic

```javascript
async function withRetry(operation, maxAttempts = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      const isTimeout = err.message.includes("timed out") ||
                        err.code === 50 ||  // maxTimeMS exceeded
                        err.name === "MongoNetworkTimeoutError"

      if (isTimeout && attempt < maxAttempts) {
        console.warn(`Attempt ${attempt} timed out, retrying in ${delayMs}ms`)
        await new Promise(r => setTimeout(r, delayMs * attempt))
        continue
      }
      throw err
    }
  }
}

// Usage
const result = await withRetry(() =>
  db.collection("orders").findOne({ _id: orderId })
)
```

## Summary

MongoDB driver connection timeouts fall into four categories: TCP connection failures, server selection failures, pool exhaustion, and per-operation timeouts. Diagnose by checking `db.serverStatus().connections` for exhaustion, using connection pool events for pool monitoring, and testing TCP connectivity for network issues. Fix by tuning pool size, reducing connection hold time in application code, and setting appropriate `maxTimeMS` on long-running operations.
