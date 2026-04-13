# How to Connect to MongoDB from Node.js Using the Native Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Node.js, Native Driver, mongodb Package, Connection

Description: Learn how to install the MongoDB Node.js driver, connect to a MongoDB instance, and perform basic CRUD operations using the official native driver.

---

## Overview

The official MongoDB Node.js driver (`mongodb` npm package) provides direct, low-level access to MongoDB from Node.js applications. It is the foundation for higher-level ODMs like Mongoose and is the best choice when you want full control over your database interactions.

## Installation

```bash
npm install mongodb
```

## Connecting to MongoDB

Create a `MongoClient` and connect once at application startup:

```javascript
const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
// For MongoDB Atlas:
// const uri = "mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 5000
});

async function connectDB() {
  await client.connect();
  console.log("Connected to MongoDB");
  return client;
}

module.exports = { client, connectDB };
```

## Getting a Database and Collection

```javascript
const db = client.db("myapp");
const users = db.collection("users");
```

## Insert Operations

```javascript
// Insert one document
const result = await users.insertOne({
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date()
});
console.log("Inserted ID:", result.insertedId);

// Insert multiple documents
const result2 = await users.insertMany([
  { name: "Bob", email: "bob@example.com", createdAt: new Date() },
  { name: "Carol", email: "carol@example.com", createdAt: new Date() }
]);
console.log("Inserted count:", result2.insertedCount);
```

## Find Operations

```javascript
// Find one document
const user = await users.findOne({ email: "alice@example.com" });

// Find multiple documents with a filter
const activeUsers = await users
  .find({ active: true })
  .sort({ name: 1 })
  .limit(20)
  .toArray();

// Find with projection (return only specific fields)
const emails = await users
  .find({ active: true }, { projection: { email: 1, name: 1, _id: 0 } })
  .toArray();
```

## Update Operations

```javascript
// Update one document
const updateResult = await users.updateOne(
  { email: "alice@example.com" },
  { $set: { lastLogin: new Date() } }
);
console.log("Modified:", updateResult.modifiedCount);

// Update multiple documents
const result = await users.updateMany(
  { active: false, createdAt: { $lt: new Date("2025-01-01") } },
  { $set: { status: "archived" } }
);

// Upsert: update if exists, insert if not
await users.updateOne(
  { email: "dave@example.com" },
  { $set: { name: "Dave", email: "dave@example.com" } },
  { upsert: true }
);
```

## Delete Operations

```javascript
// Delete one document
await users.deleteOne({ email: "bob@example.com" });

// Delete multiple documents
const deleteResult = await users.deleteMany({ status: "archived" });
console.log("Deleted:", deleteResult.deletedCount);
```

## Aggregation

```javascript
const pipeline = [
  { $match: { active: true } },
  { $group: { _id: "$country", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
];

const results = await users.aggregate(pipeline).toArray();
```

## Full Express.js Example with Connection Singleton

```javascript
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

let db;

async function main() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  db = client.db("myapp");

  app.get("/users/:id", async (req, res) => {
    const user = await db.collection("users").findOne({
      _id: new ObjectId(req.params.id)
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  });

  app.post("/users", async (req, res) => {
    const result = await db.collection("users").insertOne({
      ...req.body,
      createdAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId });
  });

  app.listen(3000, () => console.log("Server running on port 3000"));
}

main().catch(console.error);
```

## Graceful Shutdown

```javascript
process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
```

## Summary

The MongoDB Node.js native driver provides a clean async/await API for all database operations. The key best practice is to create a single `MongoClient` instance at startup and reuse it across your entire application. The driver handles connection pooling internally, so you only need to call `connect()` once and can then perform insertOne, findOne, updateMany, deleteMany, and aggregate operations against any collection.
