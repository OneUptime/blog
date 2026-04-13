# How to Monitor MongoDB with serverStatus Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Performance, Database Administration

Description: Learn how to use MongoDB's serverStatus command to retrieve real-time server metrics including memory usage, connections, operations, and replication status.

---

## Overview

The `serverStatus` command is one of the most comprehensive diagnostic tools available in MongoDB. It returns a document with over 100 fields covering every aspect of server operation - from memory and connections to lock statistics and replication lag. Understanding this output is essential for performance tuning and troubleshooting.

## Running serverStatus

Connect to MongoDB using mongosh and run the command:

```javascript
// Get full server status
db.serverStatus()

// Exclude sections you don't need
db.serverStatus({ repl: 0, metrics: 0, locks: 0 })

// Pretty print for readability
printjson(db.serverStatus())
```

## Key Sections Explained

### Connections

```javascript
db.serverStatus().connections
```

Returns:

```javascript
{
  current: 42,
  available: 819158,
  totalCreated: 15823,
  active: 5,
  threaded: 42,
  exhaustIsMaster: 0,
  exhaustHello: 41
}
```

- `current` - number of incoming connections from clients (includes both active and idle)
- `available` - number of additional connections the server can accept
- `totalCreated` - cumulative count of all connections ever created

### Operation Counters

```javascript
db.serverStatus().opcounters
```

Returns:

```javascript
{
  insert: 12045,
  query: 89234,
  update: 5612,
  delete: 234,
  getmore: 12,
  command: 102341
}
```

These are cumulative counts since server start. Calculate rates by sampling over time:

```javascript
// Sample opcounters twice, 10 seconds apart
let before = db.serverStatus().opcounters;
sleep(10000);
let after = db.serverStatus().opcounters;

// Calculate queries per second
let qps = (after.query - before.query) / 10;
print("Queries per second:", qps);
```

### Memory Usage

```javascript
db.serverStatus().mem
```

Returns:

```javascript
{
  bits: 64,
  resident: 1024,
  virtual: 3512,
  supported: true
}
```

- `resident` - physical RAM used by the process (in MB)
- `virtual` - virtual memory used by the process (in MB)

### WiredTiger Cache Statistics

```javascript
db.serverStatus().wiredTiger.cache
```

Key metrics:

```javascript
{
  "bytes currently in the cache": 536870912,
  "maximum bytes configured": 1073741824,
  "unmodified pages evicted": 4521,
  "pages read into cache": 12043,
  "pages written from cache": 8932
}
```

Monitor cache hit ratio - if pages are being read from disk frequently, consider increasing `cacheSizeGB`.

### Network Statistics

```javascript
db.serverStatus().network
```

Returns:

```javascript
{
  bytesIn: 45678901,
  bytesOut: 123456789,
  numRequests: 892341,
  physicalBytesIn: 45678901,
  physicalBytesOut: 123456789
}
```

### Replication Status

```javascript
db.serverStatus().repl
```

Returns replication status for replica set members:

```javascript
{
  topologyVersion: { processId: ObjectId("..."), counter: 6 },
  hosts: ["mongo1:27017", "mongo2:27017", "mongo3:27017"],
  setName: "rs0",
  setVersion: 1,
  isWritablePrimary: true,
  me: "mongo1:27017"
}
```

### Global Lock

```javascript
db.serverStatus().globalLock
```

```javascript
{
  totalTime: 86400000000,
  currentQueue: {
    total: 0,
    readers: 0,
    writers: 0
  },
  activeClients: {
    total: 5,
    readers: 3,
    writers: 2
  }
}
```

High values in `currentQueue` indicate lock contention.

## Creating a Monitoring Script

```javascript
// monitor.js - run with: mongosh --eval "load('monitor.js')"
function printServerHealth() {
  let status = db.serverStatus();
  
  print("=== MongoDB Server Health ===");
  print("Uptime (seconds):", status.uptime);
  print("Current connections:", status.connections.current);
  print("Available connections:", status.connections.available);
  print("Resident memory (MB):", status.mem.resident);
  print("Queued reads:", status.globalLock.currentQueue.readers);
  print("Queued writes:", status.globalLock.currentQueue.writers);
  print("Inserts:", status.opcounters.insert);
  print("Queries:", status.opcounters.query);
  print("Updates:", status.opcounters.update);
}

printServerHealth();
```

## Summary

The `serverStatus` command provides a comprehensive snapshot of MongoDB server health, covering connections, operation throughput, memory usage, WiredTiger cache performance, and replication state. By sampling this command periodically and computing deltas, you can build custom monitoring dashboards and alert on key performance indicators like connection exhaustion, lock queues, and cache eviction rates.
