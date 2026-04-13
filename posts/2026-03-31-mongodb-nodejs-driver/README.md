# How to Use MongoDB Node.js Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Node.js, JavaScript, Driver, Backend Development

Description: Learn how to use the official MongoDB Node.js driver for connecting, performing CRUD operations, aggregation, indexing, and transactions with production-ready patterns.

---

## Overview

The official MongoDB Node.js driver (`mongodb` package) provides the low-level interface for communicating with MongoDB from Node.js applications. It supports all MongoDB features including CRUD, aggregation, transactions, change streams, and GridFS.

```mermaid
flowchart LR
    App[Node.js App] --> MC[MongoClient]
    MC -->|Connection Pool| MongoDB
    MC --> DB[client.db('mydb')]
    DB --> C1[db.collection('users')]
    DB --> C2[db.collection('orders')]
    C1 --> CRUD[find, insertOne, updateOne, deleteOne]
    C2 --> AGG[aggregate]
```

## Installation

```bash
npm install mongodb
```

For TypeScript support (types are included in the package from version 4+):

```bash
npm install mongodb
npm install --save-dev typescript @types/node
```

## Connecting to MongoDB

Create a single `MongoClient` instance and reuse it throughout the application. Never create a new client per request.

```javascript
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://admin:password@127.0.0.1:27017/?authSource=admin";

const client = new MongoClient(uri, {
  maxPoolSize: 10,             // maximum connections in pool
  minPoolSize: 2,              // minimum idle connections
  connectTimeoutMS: 10000,     // connection timeout
  socketTimeoutMS: 45000,      // socket read/write timeout
  serverSelectionTimeoutMS: 5000,  // server selection timeout
});

async function connect() {
  await client.connect();
  console.log("Connected to MongoDB");
}

// Clean shutdown
process.on("SIGINT", async () => {
  await client.close();
  process.exit(0);
});

module.exports = { client };
```

## Singleton Pattern for Express.js

```javascript
// db.js
const { MongoClient } = require("mongodb");

let client;

async function getClient() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client;
}

async function getDb(dbName) {
  const c = await getClient();
  return c.db(dbName);
}

module.exports = { getClient, getDb };
```

```javascript
// In your route handler:
const { getDb } = require("./db");

app.get("/orders", async (req, res) => {
  const db = await getDb("myapp");
  const orders = await db.collection("orders").find({ status: "pending" }).toArray();
  res.json(orders);
});
```

## CRUD Operations

Insert:

```javascript
const db = client.db("myapp");
const orders = db.collection("orders");

// Insert one
const result = await orders.insertOne({
  customerId: "c123",
  items: [{ productId: "p1", qty: 2, price: 49.99 }],
  total: 99.98,
  status: "pending",
  createdAt: new Date()
});
console.log("Inserted:", result.insertedId);

// Insert many
const bulk = await orders.insertMany([
  { customerId: "c124", total: 29.99, status: "pending", createdAt: new Date() },
  { customerId: "c125", total: 149.00, status: "pending", createdAt: new Date() }
]);
console.log("Inserted:", bulk.insertedCount);
```

Find:

```javascript
// Find one
const order = await orders.findOne({ _id: new ObjectId("...") });

// Find many with filter, projection, sort, limit
const pendingOrders = await orders
  .find({ status: "pending" }, { projection: { customerId: 1, total: 1 } })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();

// Count
const count = await orders.countDocuments({ status: "pending" });

// Iterate with cursor (memory-efficient for large result sets)
const cursor = orders.find({ status: "processing" });
for await (const doc of cursor) {
  console.log(doc._id);
}
```

Update:

```javascript
const { ObjectId } = require("mongodb");

// Update one
await orders.updateOne(
  { _id: new ObjectId("...") },
  { $set: { status: "shipped" }, $currentDate: { updatedAt: true } }
);

// Update many
const updated = await orders.updateMany(
  { status: "pending", createdAt: { $lt: new Date("2026-01-01") } },
  { $set: { status: "expired" } }
);
console.log("Updated:", updated.modifiedCount);

// Upsert
await orders.updateOne(
  { externalId: "ext-001" },
  { $setOnInsert: { createdAt: new Date() }, $set: { status: "imported" } },
  { upsert: true }
);

// Find one and update (returns the updated document)
const updated_doc = await orders.findOneAndUpdate(
  { _id: new ObjectId("...") },
  { $set: { status: "confirmed" } },
  { returnDocument: "after" }
);
```

Delete:

```javascript
await orders.deleteOne({ _id: new ObjectId("...") });

const deleted = await orders.deleteMany({
  status: "cancelled",
  createdAt: { $lt: new Date("2025-01-01") }
});
console.log("Deleted:", deleted.deletedCount);
```

## Aggregation Pipeline

```javascript
const topCustomers = await orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
    _id: "$customerId",
    totalSpent: { $sum: "$total" },
    orderCount: { $sum: 1 },
    avgOrder: { $avg: "$total" }
  }},
  { $sort: { totalSpent: -1 } },
  { $limit: 10 },
  { $lookup: {
    from: "customers",
    localField: "_id",
    foreignField: "_id",
    as: "customerInfo"
  }},
  { $unwind: "$customerInfo" },
  { $project: {
    name: "$customerInfo.name",
    email: "$customerInfo.email",
    totalSpent: 1,
    orderCount: 1
  }}
]).toArray();
```

## Indexes

```javascript
// Create index
await orders.createIndex({ customerId: 1, createdAt: -1 });

// Unique index
await db.collection("users").createIndex({ email: 1 }, { unique: true });

// TTL index
await db.collection("sessions").createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// List indexes
const indexes = await orders.indexes();
console.log(indexes);
```

## Transactions

```javascript
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    await db.collection("accounts").updateOne(
      { _id: "sender", balance: { $gte: 100 } },
      { $inc: { balance: -100 } },
      { session }
    );

    await db.collection("accounts").updateOne(
      { _id: "receiver" },
      { $inc: { balance: 100 } },
      { session }
    );
  });
} finally {
  await session.endSession();
}
```

## Error Handling

```javascript
const { MongoServerError, MongoNetworkError } = require("mongodb");

try {
  await db.collection("users").insertOne({ email: "duplicate@example.com" });
} catch (error) {
  if (error instanceof MongoServerError && error.code === 11000) {
    console.error("Duplicate key error:", error.keyValue);
  } else if (error instanceof MongoNetworkError) {
    console.error("Network error:", error.message);
  } else {
    throw error;
  }
}
```

## TypeScript Example

```typescript
import { MongoClient, Document, ObjectId } from "mongodb";

interface Order extends Document {
  _id?: ObjectId;
  customerId: string;
  total: number;
  status: "pending" | "paid" | "shipped" | "cancelled";
  createdAt: Date;
}

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("myapp");
const orders = db.collection<Order>("orders");

async function getPendingOrders(): Promise<Order[]> {
  return orders.find({ status: "pending" }).sort({ createdAt: -1 }).toArray();
}
```

## Best Practices

- Create one `MongoClient` at application startup and reuse it; do not create a client per request.
- Set `maxPoolSize` based on your workload - start with 10 and adjust.
- Always handle `11000` (duplicate key) and network errors explicitly.
- Use `for await...of` on cursors for large result sets to avoid loading everything into memory.
- Use TypeScript interfaces with `db.collection<T>()` for type safety.
- Close the client on process shutdown with `client.close()`.

## Summary

The MongoDB Node.js driver provides a comprehensive API for all MongoDB operations. Create a single `MongoClient` instance with a connection pool, use `async/await` for all operations, and handle errors by checking `error.code` for specific MongoDB error codes. For type safety, use TypeScript with typed collections. Use `session.withTransaction()` for multi-document transactions and the cursor iteration pattern for large result sets.
