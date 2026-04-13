# How to Create a Unique Index in MongoDB to Enforce Uniqueness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Unique Index, Data Integrity, Constraint

Description: Learn how to create unique indexes in MongoDB to enforce that no two documents share the same value for a field or combination of fields.

---

## Overview

A unique index in MongoDB enforces that each document in a collection has a distinct value for the indexed field (or combination of fields). Attempting to insert a duplicate value throws an error. Unique indexes are essential for fields like email addresses, usernames, phone numbers, and any natural key that must be globally unique.

## Creating a Unique Index

Add `{ unique: true }` to the `createIndex()` options:

```javascript
// Unique index on email
db.users.createIndex({ email: 1 }, { unique: true })

// Unique index on username
db.users.createIndex({ username: 1 }, { unique: true })
```

## What Happens on Duplicate Insert

```javascript
db.users.insertOne({ email: "alice@example.com", name: "Alice" })
// Success

db.users.insertOne({ email: "alice@example.com", name: "Alice Clone" })
// Error: E11000 duplicate key error collection: mydb.users
//        index: email_1 dup key: { email: "alice@example.com" }
```

## Compound Unique Index

A compound unique index enforces uniqueness on a combination of fields:

```javascript
// Each (firstName, lastName) pair must be unique
db.contacts.createIndex({ firstName: 1, lastName: 1 }, { unique: true })

// Unique per user per day (one record per user per date)
db.dailyStats.createIndex({ userId: 1, date: 1 }, { unique: true })
```

## Unique Index with null Values

By default, a unique index treats `null` as a value and allows only one document with a null value for the indexed field:

```javascript
db.profiles.createIndex({ phone: 1 }, { unique: true })

db.profiles.insertOne({ name: "Alice", phone: null })  // OK
db.profiles.insertOne({ name: "Bob", phone: null })    // Error - duplicate null
db.profiles.insertOne({ name: "Charlie" })             // Error - missing field treated as null

// A sparse index only helps with missing fields, not explicit nulls
db.profiles.dropIndex("phone_1")
db.profiles.createIndex({ phone: 1 }, { unique: true, sparse: true })
// Multiple documents can omit the phone field, but only one can have phone: null

// Solution: use a partial index to allow multiple nulls and missing fields
db.profiles.dropIndex("phone_1")
db.profiles.createIndex(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
)
// Now uniqueness is enforced only when phone is a string value
```

## Unique Partial Index

Enforce uniqueness only on documents matching a filter condition:

```javascript
// Email must be unique only among active users
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" }
  }
)

// Multiple inactive users can share the same email
db.users.insertMany([
  { email: "test@example.com", status: "inactive" },
  { email: "test@example.com", status: "inactive" }
])  // Both succeed

db.users.insertOne({ email: "test@example.com", status: "active" })  // Succeeds
db.users.insertOne({ email: "test@example.com", status: "active" })  // Fails
```

## Building Unique Index on Existing Collection

If the collection already has duplicate values, `createIndex` with `unique: true` will fail:

```javascript
// Check for duplicates before creating
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
// Fix duplicates, then create the index
```

## Practical Example - User Registration System

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })

// Registration function behavior
function registerUser(email, username, password) {
  try {
    db.users.insertOne({
      email: email.toLowerCase(),
      username: username,
      passwordHash: hashPassword(password),
      createdAt: new Date()
    });
    return { success: true };
  } catch (e) {
    if (e.code === 11000) {
      // Determine which field caused the duplicate
      if (e.message.includes("email")) {
        return { error: "Email already registered" };
      }
      return { error: "Username already taken" };
    }
    throw e;
  }
}
```

## Handling Duplicate Key Errors in Application Code

```javascript
// Node.js / MongoDB driver example
try {
  await db.collection("users").insertOne(userData);
} catch (error) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    throw new Error(`Duplicate value for field: ${field}`);
  }
  throw error;
}
```

## Converting an Existing Non-Unique Index

```javascript
// Drop the non-unique index and recreate as unique
db.users.dropIndex("email_1")
db.users.createIndex({ email: 1 }, { unique: true })
```

## Summary

Unique indexes enforce that all values for an indexed field (or combination of fields) are distinct across documents in a collection. Create them with `{ unique: true }` in `createIndex()`. Duplicate inserts or updates throw error code 11000. Combine with `partialFilterExpression` to restrict uniqueness to a subset of documents or to allow multiple null/missing values. Always check for existing duplicates before creating a unique index on a populated collection.
