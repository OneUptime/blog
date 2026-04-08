# How to Configure Read and Write Timeouts in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Configuration, Performance

Description: Learn how to configure read and write timeouts in MongoDB drivers and the server to prevent hung queries and improve application resilience.

---

Timeouts in MongoDB prevent queries and operations from hanging indefinitely, protecting your application from cascading failures when the database is slow or unavailable.

## Types of Timeouts

MongoDB supports several distinct timeout settings:

| Timeout | What it controls |
|---------|-----------------|
| `serverSelectionTimeoutMS` | Time to find a suitable server |
| `connectTimeoutMS` | Time to establish a TCP connection |
| `socketTimeoutMS` | Time to wait for a response on a socket |
| `maxTimeMS` | Maximum execution time per operation |
| `wtimeoutMS` | Write concern timeout |

## Configuring Timeouts in the Connection String

Set timeouts directly in the connection URI:

```text
mongodb://user:pass@host:27017/mydb?serverSelectionTimeoutMS=5000&connectTimeoutMS=10000&socketTimeoutMS=30000
```

## Configuring Timeouts in Node.js Driver

```javascript
const { MongoClient } = require("mongodb")

const client = new MongoClient("mongodb://localhost:27017", {
  serverSelectionTimeoutMS: 5000,   // 5 seconds to find a server
  connectTimeoutMS: 10000,           // 10 seconds to connect
  socketTimeoutMS: 30000,            // 30 seconds for socket reads
})
```

## Configuring Timeouts in Python (PyMongo)

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=30000
)
```

## Setting maxTimeMS per Operation

`maxTimeMS` limits how long an individual query or command runs on the server:

```javascript
// Fail if query takes more than 2 seconds
db.orders.find({ status: "pending" }).maxTimeMS(2000)

// Apply to aggregations
db.orders.aggregate(
  [{ $group: { _id: "$status", count: { $sum: 1 } } }],
  { maxTimeMS: 5000 }
)
```

In Python:

```python
collection.find({"status": "pending"}, max_time_ms=2000)
```

## Configuring maxTimeMS as a Server Default

Set a default `maxTimeMS` for all operations on the server:

```javascript
db.adminCommand({
  setParameter: 1,
  defaultMaxTimeMS: 5000   // 5 seconds for all read operations
})
```

Or in `mongod.conf`:

```text
setParameter:
  defaultMaxTimeMS: 5000
```

## Write Concern Timeouts

Control how long to wait for write acknowledgment from replica set members:

```javascript
db.orders.insertOne(
  { item: "widget", qty: 10 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)
```

If the write concern is not satisfied within `wtimeout` milliseconds, MongoDB returns an error but the write may still have been applied.

## Handling Timeout Errors

In Node.js:

```javascript
try {
  const result = await db.collection("orders").find({}).maxTimeMS(2000).toArray()
} catch (err) {
  if (err.code === 50) {  // ExceededTimeLimit
    console.error("Query exceeded maxTimeMS")
  }
}
```

In Python:

```python
from pymongo.errors import ExecutionTimeout

try:
    docs = list(collection.find({}, max_time_ms=2000))
except ExecutionTimeout:
    print("Query exceeded time limit")
```

## Summary

Configure `serverSelectionTimeoutMS`, `connectTimeoutMS`, and `socketTimeoutMS` in your driver to control connection behavior. Use `maxTimeMS` per operation or `defaultMaxTimeMS` as a server-side guard against runaway queries. Set `wtimeout` on write concerns to prevent indefinite waits for replication acknowledgment.
