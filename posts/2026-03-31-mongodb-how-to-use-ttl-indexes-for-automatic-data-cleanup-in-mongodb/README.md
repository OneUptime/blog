# How to Use TTL Indexes for Automatic Data Cleanup in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TTL Index, Expiration, Data Cleanup, Index

Description: Learn how to create TTL indexes in MongoDB to automatically expire and remove documents after a specified time period without manual cleanup jobs.

---

## What Is a TTL Index

A TTL (Time To Live) index is a special single-field index on a Date field. MongoDB's background task periodically scans the index and deletes documents whose date field value is older than the specified expiry threshold.

## Creating a Basic TTL Index

```javascript
// Expire documents 30 days after createdAt
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }  // 30 days
)
```

## Expiring at a Specific Future Time

Set the date field to the exact time you want the document deleted:

```javascript
// Create document that expires at a specific time
db.cache.insertOne({
  key: "product:42",
  value: { name: "Widget", price: 9.99 },
  expireAt: new Date("2026-04-15T00:00:00Z")
})

// TTL index on expireAt with expireAfterSeconds: 0
db.cache.createIndex(
  { expireAt: 1 },
  { expireAfterSeconds: 0 }
)
```

## Use Cases

Common use cases for TTL indexes:

```javascript
// User sessions - expire after 24 hours
db.user_sessions.createIndex(
  { lastActivity: 1 },
  { expireAfterSeconds: 86400 }
)

// Password reset tokens - expire after 1 hour
db.password_resets.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
)

// Log entries - expire after 90 days
db.application_logs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }
)

// Email verification codes - expire after 15 minutes
db.email_verifications.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 900 }
)
```

## Checking TTL Index Configuration

```javascript
db.sessions.getIndexes()
// Look for expireAfterSeconds in the index metadata

// Or use
db.runCommand({ listIndexes: "sessions" })
```

## Modifying TTL Expiration Time

Instead of dropping and recreating the index, use `collMod` to modify `expireAfterSeconds` without rebuilding the index:

```javascript
db.runCommand({
  collMod: "sessions",
  index: {
    keyPattern: { createdAt: 1 },
    expireAfterSeconds: 604800  // change to 7 days
  }
})
```

## Limitations

Key limitations of TTL indexes:
- One TTL index per field (but multiple per collection on different fields)
- Cannot be compound indexes
- The field must be a BSON Date type or array of dates
- Deletion runs approximately every 60 seconds - not instantaneous
- Sharded collections: TTL deletion only runs on the primary

## Verifying Deletions Are Happening

```javascript
db.adminCommand({ serverStatus: 1 }).metrics.ttl
// Returns: { deletedDocuments: N, passes: N }
```

## Summary

TTL indexes automate document expiration by deleting records once their date field exceeds the configured `expireAfterSeconds` threshold. They eliminate the need for scheduled cleanup jobs for sessions, tokens, caches, and logs. Use `expireAfterSeconds: 0` with a precise future date in the document for exact expiry control.
