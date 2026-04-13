# How to Use the directConnection Option in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection, Replica Set, Configuration, Driver

Description: Learn how and when to use the directConnection option in MongoDB to bypass topology discovery and connect directly to a single MongoDB instance.

---

## What Is directConnection?

By default, when you connect to a MongoDB server that is part of a replica set, the driver performs topology discovery - it contacts the server, learns about other replica set members, and builds a topology model. The `directConnection=true` option bypasses this discovery and connects directly to the specified host only.

## When to Use directConnection

```text
Use directConnection=true when:
  - You need to connect specifically to a secondary for maintenance
  - You are running commands that must target a specific node (e.g., rs.stepDown())
  - You are connecting to a hidden or delayed secondary
  - You are debugging a specific node in isolation
  - You are connecting to a mongos router directly

Do NOT use directConnection=true for normal application traffic:
  - It disables automatic failover
  - The application will fail if that specific node goes down
```

## Connection String Format

```text
mongodb://host1:27017/mydb?directConnection=true
```

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

// Direct connection to a specific secondary for maintenance tasks
const client = new MongoClient('mongodb://host2:27017', {
  directConnection: true,
});

await client.connect();

// This connects only to host2, regardless of replica set topology
const db = client.db('admin');
const status = await db.command({ serverStatus: 1 });
console.log(`Host: ${status.host}, Role: ${status.repl.isWritablePrimary ? 'primary' : 'secondary'}`);
```

## PyMongo

```python
from pymongo import MongoClient

# Connect directly to a specific secondary
client = MongoClient(
    "mongodb://host2:27017",
    directConnection=True,
)

db = client["admin"]
status = db.command("serverStatus")
print(f"Connected to: {status['host']}")
```

## Java Driver

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

String uri = "mongodb://host2:27017/?directConnection=true";
MongoClient client = MongoClients.create(uri);
```

## Running Maintenance Commands on a Specific Node

```javascript
const { MongoClient } = require('mongodb');

// Connect directly to the primary to trigger a step-down
const primary = new MongoClient('mongodb://host1:27017', {
  directConnection: true,
});

await primary.connect();

const admin = primary.db('admin');

// replSetStepDown must be run on the primary - it forces the primary to step down for 60 seconds
await admin.command({ replSetStepDown: 60 });

await primary.close();
```

## Comparison: directConnection vs Normal Connection

```javascript
// Normal connection - driver discovers all replica set members
const normalClient = new MongoClient('mongodb://host1:27017,host2:27017', {
  replicaSet: 'rs0',
});
// Automatically fails over, distributes reads, full topology awareness

// Direct connection - connects to host2 only, no discovery
const directClient = new MongoClient('mongodb://host2:27017', {
  directConnection: true,
});
// No failover, no topology awareness - good for maintenance only
```

## directConnection with mongos

When connecting to a mongos router (sharded cluster entry point), you generally do not need `directConnection`. However, if you want to ensure a connection goes to a specific mongos and not be redirected, set it explicitly:

```text
mongodb://mongos1:27017/mydb?directConnection=true
```

## Summary

Use `directConnection=true` for operational and maintenance tasks that require targeting a specific MongoDB node - running admin commands, inspecting a secondary's state, or performing rolling maintenance. For production application traffic, always use standard topology-aware connections with the `replicaSet` option so the driver can handle elections and failover automatically.
