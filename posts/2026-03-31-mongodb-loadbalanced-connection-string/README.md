# How to Use the loadBalanced Option in MongoDB Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Load Balancer, Connection String, Atlas, Configuration

Description: Learn how to configure loadBalanced=true in MongoDB connection strings for deployments that route traffic through a load balancer like AWS NLB or Atlas Serverless.

---

## What Is the loadBalanced Option?

The `loadBalanced=true` option tells the MongoDB driver that all connections pass through a load balancer. In this topology, the driver does not perform standard replica set or sharded cluster discovery. Instead, it maintains a pool of connections to the single load balancer endpoint and relies on the load balancer to distribute traffic to the appropriate MongoDB nodes.

This mode is required for MongoDB Atlas Serverless and deployments behind AWS Network Load Balancers, Azure Load Balancers, or similar infrastructure.

## Connection String Format

```text
mongodb://host:27017/mydb?loadBalanced=true
```

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://lb.example.com:27017', {
  loadBalanced: true,
  tls: true,
  maxPoolSize: 50,
});

await client.connect();
const db = client.db('myapp');
```

## PyMongo

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://lb.example.com:27017",
    loadBalanced=True,
    tls=True,
    maxPoolSize=50,
)
```

## Java Driver

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;

String uri = "mongodb://lb.example.com:27017/mydb?loadBalanced=true&tls=true";
MongoClient client = MongoClients.create(uri);
```

## Atlas Serverless

MongoDB Atlas Serverless instances always use the load-balanced topology. The Atlas-provided connection string already includes the necessary configuration:

```text
mongodb+srv://user:pass@serverless.abc123.mongodb.net/mydb
  ?authSource=admin&retryWrites=true&w=majority
```

Atlas Serverless automatically negotiates `loadBalanced=true` via its DNS TXT records, so you do not need to specify it manually when using the Atlas-provided SRV string.

## Key Behavioral Differences

```text
Standard topology:
  - Driver monitors individual server health
  - Automatic failover and read preference routing
  - Server selection based on topology state

loadBalanced=true:
  - Driver treats all connections as going to one "server"
  - No topology monitoring or server selection
  - Load balancer handles failover transparently
  - Pinned connections for sessions and transactions
```

## Transactions with loadBalanced

Transactions work with `loadBalanced=true` but require connection pinning. The driver automatically pins a session to a specific connection for the duration of a transaction:

```javascript
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    const orders = client.db('shop').collection('orders');
    await orders.insertOne({ item: 'widget' }, { session });
    // All ops in this transaction are pinned to the same connection
  });
} finally {
  await session.endSession();
}
```

## Incompatibilities

```text
loadBalanced=true is incompatible with:
  - directConnection=true
  - replicaSet option
  - Multiple hosts in the connection string
```

```text
# This will error
mongodb://host1:27017,host2:27017/mydb?loadBalanced=true
```

## Summary

Set `loadBalanced=true` when your MongoDB deployment sits behind a load balancer - including AWS NLB, Azure Load Balancer, or custom HAProxy setups. This is also required for Atlas Serverless (though Atlas configures it automatically). The load-balanced topology simplifies connection management but removes driver-level topology awareness, delegating failover and routing to the load balancer.
