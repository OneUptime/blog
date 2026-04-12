# What Is a TTL Index in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TTL Index, Index, Data Expiration, Time Series

Description: A TTL index in MongoDB automatically deletes documents after a set time period, making it ideal for session data, logs, and temporary records.

---

## Overview

A Time-To-Live (TTL) index is a special single-field index in MongoDB that automatically removes documents from a collection after a specified number of seconds. Instead of writing a scheduled job to clean up stale data, you define the expiration policy at the index level and MongoDB handles deletion in the background.

TTL indexes are commonly used for session tokens, log entries, cache documents, notification records, and any data with a natural expiration.

## How TTL Indexes Work

MongoDB runs a background thread called the TTL monitor every 60 seconds. It scans all collections that have a TTL index and deletes documents where the indexed field value plus the expiration threshold is less than the current time.

The indexed field must be a BSON Date type (or an array of Date values). If the field contains a non-date value or is missing, the document is never expired.

## Creating a TTL Index

```javascript
// Expire documents 3600 seconds (1 hour) after the value in the "createdAt" field
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
)
```

To expire documents at a specific point in time rather than after a duration, set `expireAfterSeconds` to `0` and store the desired expiration timestamp in the indexed field:

```javascript
// The document will expire at the exact datetime stored in "expireAt"
db.notifications.createIndex(
  { expireAt: 1 },
  { expireAfterSeconds: 0 }
)
```

Insert a document with an explicit expiration time:

```javascript
db.notifications.insertOne({
  userId: "user_123",
  message: "Your trial ends tomorrow",
  expireAt: new Date("2026-04-01T00:00:00Z")
})
```

## Checking Existing TTL Indexes

```javascript
// List all indexes on a collection
db.sessions.getIndexes()

// Or use explain to verify the index is used
db.sessions.find({ createdAt: { $lt: new Date() } }).explain("executionStats")
```

## Modifying a TTL Index

Instead of dropping and recreating the index, you can modify `expireAfterSeconds` directly using the `collMod` command:

```javascript
db.runCommand({
  collMod: "sessions",
  index: {
    keyPattern: { createdAt: 1 },
    expireAfterSeconds: 7200
  }
})
```

## Limitations

- TTL indexes must be single-field indexes. Compound indexes cannot be TTL indexes.
- The indexed field must be a Date or an array of Dates.
- Deletion happens approximately every 60 seconds, so there may be a short delay after the expiration time.
- TTL indexes are not supported on capped collections.
- On a replica set, the TTL monitor runs only on the primary node. Secondaries replicate the deletes via the oplog.

## Monitoring TTL Deletions

You can observe TTL activity through the server status metrics:

```javascript
db.serverStatus().metrics.ttl
// Returns: { deletedDocuments: <number>, passes: <number> }
```

Use this to confirm the TTL monitor is running and how many documents it has removed.

## Summary

A TTL index provides a zero-maintenance way to expire documents automatically based on a date field. Create one with `createIndex` using the `expireAfterSeconds` option, point it at a Date field, and MongoDB will purge expired documents every ~60 seconds. It is the recommended approach for managing ephemeral data like sessions, logs, and transient cache entries.
