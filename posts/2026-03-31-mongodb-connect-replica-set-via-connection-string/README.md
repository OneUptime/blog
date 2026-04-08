# How to Connect to a MongoDB Replica Set via Connection String

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Connection, High Availability, Driver

Description: Learn how to connect to a MongoDB replica set via connection string with all hosts, replicaSet parameter, and read preference options for high-availability setups.

---

Connecting to a MongoDB replica set correctly ensures that your application can automatically failover to a new primary when the current primary becomes unavailable. The connection string must include all replica set members and the `replicaSet` parameter.

## Basic Replica Set Connection String

```text
mongodb://host1:27017,host2:27017,host3:27017/myDatabase?replicaSet=rs0
```

Always include all replica set members in the connection string. If the primary fails, the driver uses the other hosts to discover the new primary without requiring application code changes.

## With Authentication

```text
mongodb://appUser:password@host1:27017,host2:27017,host3:27017/myDatabase?replicaSet=rs0&authSource=admin
```

## Read Preference Options

Control which members receive read operations:

```text
mongodb://host1:27017,host2:27017,host3:27017/myDB?replicaSet=rs0&readPreference=secondaryPreferred
```

Available options:

```text
primary               read from primary only (default, strongest consistency)
primaryPreferred      prefer primary, fall back to secondary
secondary             read from secondary only (eventual consistency)
secondaryPreferred    prefer secondary, fall back to primary (reduces primary load)
nearest               lowest latency member (may be primary or secondary)
```

## Read Preference with Tag Sets

Route reads to specific data centers using tag sets:

```text
mongodb://host1:27017,host2:27017,host3:27017/myDB?replicaSet=rs0&readPreference=secondary&readPreferenceTags=dc:east
```

## Node.js Connection

```javascript
const { MongoClient } = require("mongodb");

const uri = "mongodb://host1:27017,host2:27017,host3:27017/myDB" +
            "?replicaSet=rs0&readPreference=secondaryPreferred&authSource=admin";

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000
});

await client.connect();
const db = client.db("myDB");
const result = await db.command({ hello: 1 });
console.log("Connected to:", result.me, "Primary:", result.primary);
```

## Python with PyMongo

```python
from pymongo import MongoClient, ReadPreference

client = MongoClient(
    "mongodb://host1:27017,host2:27017,host3:27017/"
    "?replicaSet=rs0&readPreference=secondaryPreferred&authSource=admin",
    serverSelectionTimeoutMS=15000
)

# Or using keyword arguments
client = MongoClient(
    host=["host1:27017", "host2:27017", "host3:27017"],
    replicaSet="rs0",
    read_preference=ReadPreference.SECONDARY_PREFERRED,
    username="appUser",
    password="password",
    authSource="admin"
)

print(client.primary)      # Current primary
print(client.secondaries)  # Current secondaries
```

## Handling Failover in Applications

Drivers automatically retry eligible operations once after a primary failure. Enable retryable writes:

```text
mongodb://host1:27017,host2:27017,host3:27017/myDB?replicaSet=rs0&retryWrites=true&w=majority
```

`retryWrites=true` is the default for all connection types in MongoDB 4.2+ compatible drivers. Setting it explicitly ensures compatibility with older driver versions.

## Write Concern for Durability

```text
mongodb://host1:27017,host2:27017,host3:27017/myDB?replicaSet=rs0&w=majority&j=true&wtimeoutMS=5000
```

`w=majority` ensures writes are acknowledged by a majority of replica set members before returning, preventing data loss on failover.

## Verifying Replica Set Connection

```javascript
// In mongosh or application
db.runCommand({ hello: 1 })
// Returns: { isWritablePrimary: true, hosts: [...], primary: "host:port", setName: "rs0" }

db.runCommand({ replSetGetStatus: 1 })
// Shows all members and their states
```

## Summary

A replica set connection string must list all member hosts, include `replicaSet=<name>`, and set `retryWrites=true` and `w=majority` for production. Use `readPreference=secondaryPreferred` to distribute read load across secondaries while keeping the primary available for writes and consistent reads.
