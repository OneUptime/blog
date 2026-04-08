# How to Debug MongoDB Applications in Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker, Debug, Container, Troubleshooting

Description: Debug MongoDB connection errors, slow queries, and driver issues in containerized applications using mongosh, logs, and the MongoDB profiler.

---

## Overview

Debugging a MongoDB application running inside a container requires access to both the container logs and the MongoDB server itself. Common issues include connection string misconfiguration, authentication failures, slow queries from missing indexes, and connection pool exhaustion. This guide covers the tools and techniques for diagnosing all of them.

## Verifying MongoDB Connectivity from App Container

Use `mongosh` inside the application container to verify the MongoDB connection string before running application code.

```bash
# Exec into the app container
docker exec -it app-container bash

# Test the connection string
mongosh "mongodb://appuser:password@mongo:27017/mydb?authSource=admin" \
  --eval "db.runCommand({ ping: 1 })"
```

## Inspecting MongoDB Container Logs

```bash
# Tail MongoDB logs for connection and authentication events
docker logs mongo-container --tail 100 -f

# Filter for specific errors
docker logs mongo-container 2>&1 | grep -E "(error|warning|failed|SASL)"
```

## Common Error: Connection Refused

If `mongo:27017` is not reachable, check the Docker network and health status.

```bash
# Check that both containers are on the same network
docker network inspect bridge

# From the app container, check port reachability
docker exec app-container nc -zv mongo 27017

# Check MongoDB health
docker inspect mongo-container --format='{{.State.Health.Status}}'
```

## Enabling the MongoDB Profiler for Slow Queries

Connect to MongoDB and enable profiling to capture slow operations.

```javascript
// Connect with mongosh
use mydb

// Enable profiler: log queries slower than 100ms
db.setProfilingLevel(1, { slowms: 100 })

// Read slow query logs
db.system.profile.find().sort({ ts: -1 }).limit(10).pretty()

// Check currently running operations
db.currentOp({ "active": true, "secs_running": { $gt: 1 } })
```

## Analyzing Driver Connection Issues

Add verbose logging to the MongoDB Node.js driver to see every event.

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI, {
  monitorCommands: true,
  mongodbLogPath: "stderr",
});

client.on("commandStarted", (event) => {
  if (process.env.LOG_MONGO_COMMANDS === "true") {
    console.log("Command started:", JSON.stringify(event.command, null, 2));
  }
});

client.on("commandFailed", (event) => {
  console.error("Command failed:", event.commandName, event.failure);
});
```

## Debugging Index Usage with explain()

Run `explain()` on slow queries to see whether MongoDB uses an index or performs a collection scan.

```javascript
const result = await db
  .collection("orders")
  .find({ status: "pending", customerId: "cust_001" })
  .explain("executionStats");

console.log("Stage:", result.queryPlanner.winningPlan.stage);
console.log("Docs examined:", result.executionStats.totalDocsExamined);
console.log("Docs returned:", result.executionStats.nReturned);
console.log("Index used:", result.queryPlanner.winningPlan.inputStage?.indexName);
```

## Container Health Check for Readiness

Ensure the application waits for MongoDB to be fully ready before connecting.

```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping').ok", "--quiet"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

## Summary

Debugging MongoDB applications in containers starts with verifying connectivity using `mongosh` from inside the container, then checking Docker logs and network settings. For performance issues, enable the MongoDB profiler to capture slow queries and use `explain()` to confirm index usage. Add event listeners to the MongoDB driver during development to surface connection and command-level errors early.
