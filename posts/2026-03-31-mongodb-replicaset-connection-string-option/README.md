# How to Use the replicaSet Option in MongoDB Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Connection String, High Availability, Configuration

Description: Learn how to use the replicaSet option in MongoDB connection strings to enable automatic failover and read scaling in replica set deployments.

---

## Why Specify replicaSet in the Connection String?

When connecting to a MongoDB replica set, the `replicaSet` option tells the driver the name of the replica set it should expect. This enables the driver to discover all members, perform automatic failover during elections, and apply read preference routing. Without it, the driver may connect to a single node without awareness of the set topology.

## Basic Connection String Format

```text
mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=myReplicaSet
```

You can list one or more seed hosts. The driver will discover additional members automatically using the `hello` (or legacy `isMaster`) command.

## Minimum Viable Connection String

Even a single seed host works as long as `replicaSet` is specified:

```text
mongodb://host1:27017/mydb?replicaSet=myReplicaSet
```

The driver contacts `host1`, runs discovery, and finds all other members of `myReplicaSet`.

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(
  'mongodb://host1:27017,host2:27017,host3:27017/mydb',
  { replicaSet: 'myReplicaSet' }
);

await client.connect();

// Reads can now be distributed based on readPreference
const db = client.db('mydb');
const products = await db.collection('products')
  .find({}, { readPreference: 'secondaryPreferred' })
  .toArray();
```

## PyMongo

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://host1:27017,host2:27017,host3:27017/mydb",
    replicaSet="myReplicaSet",
)

db = client["mydb"]
products = list(db.products.find({}))
```

## Java Driver

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

String uri = "mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=myReplicaSet";
MongoClient client = MongoClients.create(uri);
MongoDatabase db = client.getDatabase("mydb");
```

## Finding Your Replica Set Name

If you do not know the replica set name, connect to a node via mongosh and run:

```bash
mongosh mongodb://host1:27017 --eval "rs.status().set"
```

## replicaSet with SRV Records

When using `mongodb+srv://` connection strings, the replica set name is typically discovered automatically via DNS TXT records, so the `replicaSet` parameter is optional:

```text
mongodb+srv://user:pass@cluster.example.com/mydb
```

## What Happens Without replicaSet

Without `replicaSet`, the driver treats the connection as a standalone topology. If the node is actually a replica set member, some operations may fail with errors like `not primary` because the driver does not know to retry against the primary.

```text
# Missing replicaSet - connects to single node, no failover
mongodb://host1:27017/mydb

# Correct - driver-aware of topology, enables automatic failover
mongodb://host1:27017,host2:27017/mydb?replicaSet=rs0
```

## Summary

Always include the `replicaSet` parameter in connection strings for replica set deployments. It enables the driver to perform topology discovery, automatic failover, and read preference routing. List at least two seed hosts to ensure connectivity even if one host is temporarily unavailable.
