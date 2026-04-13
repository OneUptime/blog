# How to Use db.adminCommand for Administrative Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Administration, Command, Operation, Diagnostic

Description: Learn how to use db.adminCommand() to run administrative commands in MongoDB including server status, log rotation, parameter changes, and connection management.

---

## Introduction

`db.adminCommand()` runs a command against the `admin` database regardless of which database is currently selected. Many MongoDB administrative operations require admin privileges and must target the admin database. Using `db.adminCommand()` is the standard way to execute these from any database context in the shell.

## Syntax

```javascript
db.adminCommand({ commandName: 1, [option]: value, ... })

// Equivalent to:
use admin
db.runCommand({ commandName: 1 })
```

## Server Status and Diagnostics

```javascript
// Full server status (metrics, connections, locks, memory, etc.)
db.adminCommand({ serverStatus: 1 })

// Key sections only
var status = db.adminCommand({ serverStatus: 1 })
printjson({
  uptime: status.uptime,
  connections: status.connections,
  opcounters: status.opcounters,
  mem: status.mem,
  repl: status.repl
})

// Host info (OS, hardware)
db.adminCommand({ hostInfo: 1 })

// Build info (MongoDB version, modules)
db.adminCommand({ buildInfo: 1 })
```

## Connection Management

```javascript
// Check current connection count
var s = db.adminCommand({ serverStatus: 1 })
print("Current:", s.connections.current)
print("Available:", s.connections.available)
print("Total created:", s.connections.totalCreated)

// List all current operations (active and idle)
db.adminCommand({ currentOp: 1, $all: true })

// Kill a specific operation by opId
db.adminCommand({ killOp: 1, op: 12345 })

// Kill all operations from a specific client IP
db.adminCommand({
  currentOp: 1,
  client: { $regex: "^192.168.1.100" }
}).inprog.forEach(op => {
  if (op.secs_running > 30) {
    db.adminCommand({ killOp: 1, op: op.opid })
    print("Killed:", op.opid)
  }
})
```

## Parameter Management

```javascript
// Get a runtime parameter
db.adminCommand({ getParameter: 1, logLevel: 1 })

// Set log verbosity level (0=default, 1-5=verbose)
db.adminCommand({ setParameter: 1, logLevel: 1 })

// Change slow query threshold (milliseconds)
db.adminCommand({ setParameter: 1, slowOpThresholdMs: 200 })

// Get all parameters
db.adminCommand({ getParameter: "*" })
```

## Log Management

```javascript
// Rotate log files (writes new log, renames old)
db.adminCommand({ logRotate: 1 })

// Print recent log entries to the shell
db.adminCommand({ getLog: "global" }).log.slice(-20).forEach(l => print(l))

// Get startup warnings
db.adminCommand({ getLog: "startupWarnings" }).log.forEach(l => print(l))
```

## Index Operations

```javascript
// Force all indexes to be rebuilt (deprecated since MongoDB 6.0)
db.runCommand({ reIndex: "myCollection" })

// Validate a specific collection
db.runCommand({ validate: "myCollection", full: true })

// Check for index key size issues
db.runCommand({ validate: "myCollection" }).errors
```

## Replication Commands

```javascript
// Get replication info
db.adminCommand({ replSetGetStatus: 1 })

// Freeze a secondary so it cannot become primary for N seconds
db.adminCommand({ replSetFreeze: 60 })

// Step down current primary
db.adminCommand({ replSetStepDown: 120 })

// Get replication configuration
db.adminCommand({ replSetGetConfig: 1 })
```

## Sharding Commands

```javascript
// Add a shard
db.adminCommand({
  addShard: "rs-shard2/node1:27017,node2:27017",
  name: "rs-shard2"
})

// Enable sharding on a database (no longer required since MongoDB 6.0)
db.adminCommand({ enableSharding: "myDatabase" })

// Flush router config cache (run on mongos)
db.adminCommand({ flushRouterConfig: 1 })

// Check sharding cluster status
db.adminCommand({ connPoolStats: 1 })
```

## Storage and Compaction

```javascript
// Get storage stats for the admin database
db.adminCommand({ dbStats: 1 })

// Compact a specific collection (defragments, reclaims disk space)
// Note: since MongoDB 4.4, compact does not block reads or writes
db.runCommand({ compact: "myCollection" })

// Fsync and lock (useful before filesystem snapshot)
db.adminCommand({ fsync: 1, lock: true })
db.adminCommand({ fsyncUnlock: 1 })
```

## Feature Compatibility

```javascript
// Check current FCV (Feature Compatibility Version)
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })

// Set FCV (required during upgrades/downgrades)
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

## Creating a Helper Script

```javascript
// Save as admin-check.js and run with: mongosh admin-check.js
var health = {}

health.serverVersion = db.adminCommand({ buildInfo: 1 }).version
health.uptime = db.adminCommand({ serverStatus: 1 }).uptime
health.connections = db.adminCommand({ serverStatus: 1 }).connections
health.slowOpThreshold = db.adminCommand({ getParameter: 1, slowOpThresholdMs: 1 }).slowOpThresholdMs
health.logLevel = db.adminCommand({ getParameter: 1, logLevel: 1 }).logLevel

printjson(health)
```

## Summary

`db.adminCommand()` is the gateway to MongoDB's administrative operations. It handles server diagnostics, parameter tuning, log management, connection monitoring, and replica set/sharding administration. Always connect with a user that has the `clusterAdmin` or `root` role before using admin commands in production. Use `getParameter`/`setParameter` for runtime tuning without restarts, and `serverStatus` for comprehensive real-time metrics.
