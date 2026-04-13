# How to Handle Duplicate Key Errors During Bulk Inserts in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Duplicate Key, Bulk Insert, Error Handling, Upsert

Description: Learn strategies for handling E11000 duplicate key errors during MongoDB bulk inserts, including skip, upsert, and replace patterns.

---

## Why Duplicate Key Errors Happen in Bulk Inserts

Bulk inserts fail with error code 11000 (E11000) when an inserted document violates a unique index constraint. This happens frequently when:

- Importing data that may already be partially loaded
- Re-processing event streams with at-least-once delivery
- Merging data from multiple sources with overlapping IDs

## Using Ordered vs Unordered for Partial Success

By default, `bulkWrite` and `insertMany` use ordered mode - a duplicate stops the entire batch:

```javascript
// Ordered mode: stops at first duplicate
try {
  await db.collection("users").insertMany([
    { _id: "user1", name: "Alice" },
    { _id: "user2", name: "Bob" },      // exists - ERROR
    { _id: "user3", name: "Charlie" }   // never inserted
  ])
} catch (err) {
  console.log("Inserted:", err.result.insertedCount)  // only 1
}
```

Switch to unordered to insert all non-duplicate documents:

```javascript
// Unordered mode: skips duplicates, continues inserting
try {
  await db.collection("users").insertMany([
    { _id: "user1", name: "Alice" },
    { _id: "user2", name: "Bob" },      // duplicate - skipped
    { _id: "user3", name: "Charlie" }   // inserted
  ], { ordered: false })
} catch (err) {
  if (err.code === 11000 || (err.writeErrors && err.writeErrors.some(e => e.code === 11000))) {
    console.log("Some duplicates skipped, continuing")
    console.log("Inserted:", err.result.insertedCount)
  } else {
    throw err
  }
}
```

## Upsert Pattern: Insert or Update

Use `bulkWrite` with `upsert: true` to insert new documents and update existing ones:

```javascript
const operations = records.map(record => ({
  updateOne: {
    filter: { _id: record.id },
    update: { $set: { ...record } },
    upsert: true  // insert if not found, update if found
  }
}))

const result = await db.collection("products").bulkWrite(operations, { ordered: false })
console.log("Upserted:", result.upsertedCount)
console.log("Modified:", result.modifiedCount)
```

## Replace on Duplicate Pattern

Use `replaceOne` with `upsert: true` to overwrite existing documents entirely:

```javascript
const operations = data.map(item => ({
  replaceOne: {
    filter: { _id: item._id },
    replacement: item,
    upsert: true
  }
}))

await db.collection("snapshots").bulkWrite(operations, { ordered: false })
```

## Filtering Out Existing IDs Before Insert

For large imports, pre-check which IDs already exist to avoid errors entirely:

```javascript
async function insertNewOnly(collection, documents) {
  const ids = documents.map(d => d._id)

  // Find which IDs already exist
  const existing = await collection
    .find({ _id: { $in: ids } }, { projection: { _id: 1 } })
    .toArray()

  const existingSet = new Set(existing.map(d => d._id.toString()))

  // Filter to only new documents
  const newDocs = documents.filter(d => !existingSet.has(d._id.toString()))

  if (newDocs.length === 0) {
    console.log("All documents already exist, nothing to insert")
    return { insertedCount: 0 }
  }

  return await collection.insertMany(newDocs, { ordered: false })
}
```

## Handling Duplicates in Compound Unique Indexes

Duplicate key errors also occur on compound unique indexes:

```javascript
// Collection has unique index on { userId: 1, date: 1 }
db.dailyStats.createIndex({ userId: 1, date: 1 }, { unique: true })

try {
  await db.dailyStats.insertMany(stats, { ordered: false })
} catch (err) {
  if (err.writeErrors) {
    err.writeErrors.forEach(e => {
      if (e.code === 11000) {
        // Log the duplicate key error details
        console.log("Duplicate on:", e.errmsg)
      }
    })
  }
}
```

## Idempotent Import with $setOnInsert

Use `$setOnInsert` to set fields only when a document is newly inserted, leaving existing documents unchanged:

```javascript
const operations = records.map(record => ({
  updateOne: {
    filter: { _id: record.id },
    update: {
      $setOnInsert: record,  // only applied on insert, not update
    },
    upsert: true
  }
}))

await db.collection("events").bulkWrite(operations, { ordered: false })
```

This is useful for idempotent imports: insert the full document on first write, do nothing on subsequent writes with the same ID.

## Logging and Alerting on Duplicates

Track duplicate rates to detect pipeline issues:

```javascript
async function bulkInsertWithMetrics(collection, documents) {
  try {
    const result = await collection.insertMany(documents, { ordered: false })
    return { inserted: result.insertedCount, duplicates: 0 }
  } catch (err) {
    if (!err.writeErrors) throw err

    const duplicates = err.writeErrors.filter(e => e.code === 11000).length
    const otherErrors = err.writeErrors.filter(e => e.code !== 11000)

    if (otherErrors.length > 0) {
      throw new Error(`Non-duplicate errors: ${otherErrors.map(e => e.errmsg).join(", ")}`)
    }

    return {
      inserted: err.result.insertedCount,
      duplicates
    }
  }
}
```

## Summary

Handle duplicate key errors during MongoDB bulk inserts by using unordered mode to allow partial success, switching to `bulkWrite` with `upsert: true` when you want to update existing documents, or pre-filtering IDs to avoid errors altogether. The `$setOnInsert` operator is particularly useful for idempotent imports where re-running the same data should have no effect on already-inserted documents.
