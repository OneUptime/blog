# How to Handle Duplicate Key Errors on Unique Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Unique Index, Error Handling, E11000

Description: Learn how to detect, handle, and prevent duplicate key errors (E11000) on unique indexes in MongoDB with practical application patterns.

---

## Overview

When you insert or update a document that would create a duplicate value in a unique index, MongoDB throws a duplicate key error with code 11000. Understanding how to handle these errors gracefully and prevent them proactively is essential for building reliable applications.

## The Duplicate Key Error

```text
E11000 duplicate key error collection: mydb.users
index: email_1 dup key: { email: "alice@example.com" }
Error code: 11000
```

## Reproducing the Error

```javascript
db.users.createIndex({ email: 1 }, { unique: true })

db.users.insertOne({ email: "alice@example.com", name: "Alice" })
// OK

db.users.insertOne({ email: "alice@example.com", name: "Duplicate Alice" })
// Error: E11000 duplicate key error
```

## Handling in Node.js

```javascript
const { MongoClient, MongoServerError } = require("mongodb");

async function createUser(db, userData) {
  try {
    const result = await db.collection("users").insertOne(userData);
    return { success: true, id: result.insertedId };
  } catch (error) {
    if (error.code === 11000) {
      // Parse which field caused the duplicate
      const field = Object.keys(error.keyPattern)[0];
      return {
        success: false,
        error: "duplicate_key",
        field: field,
        message: `The ${field} is already in use`
      };
    }
    throw error; // Re-throw unexpected errors
  }
}
```

## Handling in Python (pymongo)

```python
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

def create_user(collection, user_data):
    try:
        result = collection.insert_one(user_data)
        return {"success": True, "id": str(result.inserted_id)}
    except DuplicateKeyError as e:
        # Extract field from error details
        key_value = e.details.get("keyValue", {})
        field = list(key_value.keys())[0] if key_value else "unknown"
        return {
            "success": False,
            "error": "duplicate_key",
            "field": field
        }
```

## Using upsert to Avoid Duplicate Errors

```javascript
// Instead of insert, use upsert to handle existing documents
db.users.updateOne(
  { email: "alice@example.com" },
  { $setOnInsert: { name: "Alice", createdAt: new Date() } },
  { upsert: true }
)
// If email exists: no change (result.matchedCount: 1, upsertedId: null)
// If email doesn't exist: inserts the document
```

## Checking for Existence Before Insert

```javascript
// Check-then-insert pattern (not atomic - race condition possible)
const existing = await db.collection("users").findOne({ email });
if (existing) {
  return { error: "Email already registered" };
}
await db.collection("users").insertOne(newUser);
```

For atomic "insert-if-not-exists", use upsert (shown above) or handle the E11000 error after insert.

## Bulk Insert with Duplicate Handling

When bulk inserting, use `ordered: false` to continue inserting after a duplicate:

```javascript
const result = await db.collection("users").insertMany(userArray, { ordered: false });
// ordered: false continues inserting other documents even if some fail
// result.insertedCount shows how many succeeded
```

```javascript
try {
  await db.collection("users").insertMany(users, { ordered: false });
} catch (error) {
  if (error.code === 11000 || error.name === "MongoBulkWriteError") {
    const inserted = error.result.insertedCount;
    const failed = error.writeErrors.length;
    console.log(`Inserted: ${inserted}, Duplicates skipped: ${failed}`);
    // error.writeErrors contains details about each failed document
  }
}
```

## Finding Existing Duplicates in a Collection

Before adding a unique index, find and resolve existing duplicates:

```javascript
// Find duplicate emails
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } },
  { $project: { email: "$_id", count: 1, duplicateIds: { $slice: ["$ids", 1, 100] } } }
])
// duplicateIds contains the IDs to remove (keeping the first occurrence)
```

## Parsing E11000 Error Details

```javascript
function parseDuplicateKeyError(error) {
  if (error.code !== 11000) return null;

  return {
    code: error.code,
    collection: error.errmsg.match(/collection: (\S+)/)?.[1],
    index: error.errmsg.match(/index: (\S+)/)?.[1],
    keyPattern: error.keyPattern,      // { email: 1 }
    keyValue: error.keyValue           // { email: "alice@example.com" }
  };
}
```

## Practical Patterns for User Registration

```javascript
async function registerUser(db, email, username, passwordHash) {
  try {
    await db.collection("users").insertOne({
      email: email.toLowerCase().trim(),
      username: username.trim(),
      passwordHash,
      createdAt: new Date()
    });
    return { registered: true };
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === "email") {
        return { registered: false, reason: "email_taken" };
      }
      if (field === "username") {
        return { registered: false, reason: "username_taken" };
      }
    }
    throw error;
  }
}
```

## Summary

Duplicate key errors (code 11000) occur when an insert or update violates a unique index constraint. Handle them by catching the error and checking `error.code === 11000`, then inspecting `error.keyPattern` or `error.keyValue` to determine which field caused the conflict. Use `upsert` operations for atomic insert-or-update behavior, and `ordered: false` in bulk inserts to skip duplicates and continue processing. Always resolve existing duplicates before creating a unique index on a populated collection.
