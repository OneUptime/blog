# How to Work with ObjectId in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, ObjectId, Document, Query

Description: A practical guide to MongoDB ObjectId - how it is structured, how to create and compare them, and how to use them effectively in queries and applications.

---

## What Is an ObjectId

`ObjectId` is MongoDB's default `_id` type. It is a 12-byte BSON value composed of a 4-byte Unix timestamp, a 5-byte random value unique to the machine and process, and a 3-byte incrementing counter. This structure guarantees uniqueness across distributed systems without coordination.

## Creating ObjectIds

In mongosh, create an ObjectId with or without a hex string argument:

```javascript
// Auto-generated
const id1 = new ObjectId();
print(id1); // ObjectId("507f1f77bcf86cd799439011")

// From a specific hex string
const id2 = new ObjectId("507f1f77bcf86cd799439011");
print(id2.toString()); // "507f1f77bcf86cd799439011"
```

In Node.js with the official driver:

```javascript
const { ObjectId } = require("mongodb");
const id = new ObjectId();
console.log(id.toHexString());
```

## Querying by ObjectId

Always pass an `ObjectId` instance when filtering, not a raw string:

```javascript
// Correct - uses ObjectId type
db.users.findOne({ _id: new ObjectId("507f1f77bcf86cd799439011") });

// Wrong - string will not match BSON ObjectId
db.users.findOne({ _id: "507f1f77bcf86cd799439011" });
```

## Comparing ObjectIds

ObjectIds are naturally sortable by creation time because the timestamp occupies the first 4 bytes. Range queries on `_id` can serve as time-range filters:

```javascript
const start = new ObjectId(Math.floor(new Date("2024-01-01").getTime() / 1000).toString(16) + "0000000000000000");
const end   = new ObjectId(Math.floor(new Date("2024-12-31").getTime() / 1000).toString(16) + "0000000000000000");

db.events.find({ _id: { $gte: start, $lte: end } });
```

## Checking Equality and Existence

```javascript
// Check if two ObjectIds are equal
const a = new ObjectId("507f1f77bcf86cd799439011");
const b = new ObjectId("507f1f77bcf86cd799439011");
print(a.equals(b)); // true

// Check if a field holds an ObjectId type
db.orders.find({ productId: { $type: "objectId" } });
```

## Converting Between ObjectId and String

```javascript
const id = new ObjectId("507f1f77bcf86cd799439011");

// ObjectId to string
const str = id.toString();        // "507f1f77bcf86cd799439011"
const hex = id.toHexString();     // same as toString()

// String back to ObjectId
const back = new ObjectId(str);
```

In aggregation pipelines, convert with `$toString` and `$toObjectId`:

```javascript
db.orders.aggregate([
  { $addFields: { idStr: { $toString: "$_id" } } }
]);
```

## Summary

MongoDB ObjectId encodes a timestamp, random value, and counter into 12 bytes, making it globally unique and naturally time-ordered. Always use `ObjectId` instances when querying by `_id`, leverage `equals()` for comparisons, and exploit the timestamp prefix for efficient time-range queries without a separate date index.
