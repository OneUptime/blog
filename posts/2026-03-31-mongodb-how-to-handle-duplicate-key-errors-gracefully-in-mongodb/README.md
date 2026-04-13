# How to Handle Duplicate Key Errors Gracefully in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Error Handling, Unique Index, Node.js, Python

Description: Learn how to detect and handle MongoDB duplicate key errors (error code 11000) gracefully in Node.js and Python applications to build robust upsert logic.

---

## Understanding Duplicate Key Errors

When you insert a document that violates a unique index, MongoDB throws a `WriteError` with error code `11000` and an error name of `E11000 duplicate key error`. This happens with:
- The `_id` field (always unique)
- Any field with a `unique: true` index
- Compound unique indexes

The error message includes the collection namespace, the index name, and the duplicate key value.

## Unique Index Setup Example

```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
```

## Catching Duplicate Key Errors in Node.js

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const users = client.db("myApp").collection("users");

async function createUser(email, username, password) {
  try {
    const result = await users.insertOne({ email, username, password });
    return { success: true, id: result.insertedId };
  } catch (err) {
    if (err.code === 11000) {
      // Determine which field caused the conflict
      const field = getDuplicateField(err.message);
      return { success: false, error: `${field} is already taken.` };
    }
    throw err; // Re-throw unexpected errors
  }
}

function getDuplicateField(errorMessage) {
  if (errorMessage.includes("email")) return "Email";
  if (errorMessage.includes("username")) return "Username";
  return "A unique field";
}
```

Checking the error key pattern from `keyValue`:

```javascript
async function createUser(userData) {
  try {
    await users.insertOne(userData);
    return { success: true };
  } catch (err) {
    if (err.code === 11000) {
      const duplicateKey = Object.keys(err.keyValue || {})[0];
      const duplicateValue = err.keyValue?.[duplicateKey];
      return {
        success: false,
        field: duplicateKey,
        value: duplicateValue,
        message: `${duplicateKey} '${duplicateValue}' already exists`
      };
    }
    throw err;
  }
}
```

## Catching Duplicate Key Errors in Python

```python
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

client = MongoClient("mongodb://localhost:27017")
users = client["myApp"]["users"]

def create_user(email, username, password):
    try:
        result = users.insert_one({
            "email": email,
            "username": username,
            "password": password
        })
        return {"success": True, "id": str(result.inserted_id)}
    except DuplicateKeyError as e:
        details = e.details or {}
        key_value = details.get("keyValue", {})
        field = next(iter(key_value), "unknown field")
        value = key_value.get(field)
        return {
            "success": False,
            "field": field,
            "message": f"{field} '{value}' is already taken"
        }
```

## Upsert with Conflict Handling

Use `findOneAndUpdate` with `upsert: true` to either insert or update without a separate existence check:

```javascript
async function upsertUser(email, update) {
  try {
    const result = await users.findOneAndUpdate(
      { email },
      { $set: update },
      { upsert: true, returnDocument: "after" }
    );
    return { success: true, user: result };
  } catch (err) {
    if (err.code === 11000) {
      // Concurrent upsert - another process inserted between our check and write
      // Retry the operation
      const existing = await users.findOne({ email });
      return { success: false, conflict: true, existing };
    }
    throw err;
  }
}
```

## Bulk Insert with Ordered vs Unordered

For bulk inserts, use `ordered: false` to continue after duplicate key errors:

```javascript
const docs = [
  { email: "a@example.com", name: "Alice" },
  { email: "b@example.com", name: "Bob" },
  { email: "a@example.com", name: "Duplicate Alice" }  // duplicate
];

try {
  const result = await users.insertMany(docs, { ordered: false });
  console.log(`Inserted ${result.insertedCount} documents`);
} catch (err) {
  if (err.code === 11000 || err.name === "MongoBulkWriteError") {
    console.log(`Inserted: ${err.result.insertedCount}`);
    console.log(`Errors: ${err.writeErrors.length}`);
    err.writeErrors.forEach(we => {
      console.log(`  Skipped index ${we.index}: ${we.errmsg}`);
    });
  } else {
    throw err;
  }
}
```

## Summary

Duplicate key errors in MongoDB have error code 11000 and occur when a document violates a unique index. In Node.js, check `err.code === 11000` and use `err.keyValue` to identify the conflicting field. In Python, catch `DuplicateKeyError` from `pymongo.errors`. For bulk operations, use `ordered: false` to continue inserting non-duplicate documents and inspect `writeErrors` for the ones that failed.
