# How to Query Documents by ObjectId in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, ObjectId, Index, Driver

Description: Learn how to correctly query MongoDB documents by ObjectId, including type conversion, range queries, and common mistakes to avoid.

---

MongoDB uses `ObjectId` as the default `_id` type. Querying by ObjectId requires using the correct BSON type - a plain string will not match. Understanding how to properly construct ObjectId queries is fundamental to working with MongoDB.

## The ObjectId Type

An ObjectId is a 12-byte BSON type consisting of:
- 4 bytes: Unix timestamp (seconds since epoch)
- 5 bytes: random value per process
- 3 bytes: incrementing counter

This structure means ObjectIds are sortable by creation time.

## Basic Query by _id

```javascript
// In mongosh (ObjectId is a built-in global)
db.users.findOne({ _id: ObjectId("64a1b2c3d4e5f6a7b8c9d0e1") })
```

A common mistake is querying with a plain string:

```javascript
// WRONG - returns null because types don't match
db.users.findOne({ _id: "64a1b2c3d4e5f6a7b8c9d0e1" })

// CORRECT
db.users.findOne({ _id: new ObjectId("64a1b2c3d4e5f6a7b8c9d0e1") })
```

## Querying in Node.js (Official Driver)

```javascript
const { MongoClient, ObjectId } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("myapp");

async function getUserById(id) {
  return db.collection("users").findOne({
    _id: new ObjectId(id)
  });
}

// Usage
const user = await getUserById("64a1b2c3d4e5f6a7b8c9d0e1");
```

## Validating ObjectId Format Before Querying

```javascript
function isValidObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

async function safeGetUser(id) {
  if (!isValidObjectId(id)) {
    throw new Error("Invalid ObjectId format");
  }
  return db.collection("users").findOne({ _id: new ObjectId(id) });
}
```

## Querying a Range of ObjectIds by Time

Because ObjectIds encode timestamps, you can query by creation time using ObjectId ranges:

```javascript
// Find documents created after a specific date
function objectIdFromDate(date) {
  return ObjectId.createFromTime(Math.floor(date.getTime() / 1000));
}

const startDate = new Date("2024-01-01T00:00:00Z");
const endDate = new Date("2024-12-31T23:59:59Z");

db.events.find({
  _id: {
    $gte: objectIdFromDate(startDate),
    $lte: objectIdFromDate(endDate)
  }
})
```

## Querying by ObjectId in Referenced Fields

When documents reference other documents by ObjectId:

```javascript
// Find all posts by a specific author
db.posts.find({
  authorId: new ObjectId("64a1b2c3d4e5f6a7b8c9d0e1")
})
```

Index the reference field for performance:

```javascript
db.posts.createIndex({ authorId: 1 })
```

## Querying Multiple ObjectIds with $in

```javascript
const ids = [
  "64a1b2c3d4e5f6a7b8c9d0e1",
  "64a1b2c3d4e5f6a7b8c9d0e2",
  "64a1b2c3d4e5f6a7b8c9d0e3"
];

db.users.find({
  _id: { $in: ids.map(id => new ObjectId(id)) }
})
```

## Extracting the Timestamp from an ObjectId

```javascript
const doc = db.events.findOne({});
const createdAt = doc._id.getTimestamp();
console.log(createdAt); // ISODate("2024-07-15T...")
```

## Summary

Always convert string IDs to `ObjectId` before querying - a string comparison against an ObjectId field will never match. Use `ObjectId.isValid()` to validate before conversion. Take advantage of the embedded timestamp for time-range queries without needing a separate `createdAt` field. Index any field that stores references as ObjectIds to keep lookups efficient.
