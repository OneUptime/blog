# How to Implement Audit Trails in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Audit Trail, History, Change Tracking, Compliance

Description: Build a complete document history audit trail in MongoDB that records every change to a document so you can reconstruct its state at any point in time.

---

## Overview

An audit trail records every change made to a document over time, enabling you to answer "what was this document's state at date X?" and "what changed between version 3 and version 4?". Unlike audit logging (which records who did what), an audit trail stores the actual document state at each version, making it possible to reconstruct history and compute diffs. This guide implements two patterns: shadow collection (full document snapshots) and an inline history array approach.

## Pattern 1 - Shadow Collection (Version Snapshots)

Every update to the main document also writes a snapshot to a history collection.

### Schema

```javascript
// products collection (current state)
{
  _id: ObjectId("64a1b2c3d4e5f6a7b8c9d0e1"),
  name: "Widget Pro",
  price: 49.99,
  stock: 100,
  __v: 3,
  updatedAt: ISODate("2026-03-31T12:00:00Z"),
  updatedBy: "user-alice"
}

// products_history collection (snapshots)
{
  _id: ObjectId("..."),
  documentId: ObjectId("64a1b2c3d4e5f6a7b8c9d0e1"),
  version: 3,
  snapshot: {
    name: "Widget Pro",
    price: 49.99,
    stock: 100
  },
  changedBy: "user-alice",
  changedAt: ISODate("2026-03-31T12:00:00Z"),
  reason: "Price adjustment"
}
```

### Audit Trail Service

```javascript
class AuditTrailService {
  constructor(db) {
    this.db = db
  }

  async updateWithHistory(collection, filter, update, context = {}) {
    // 1. Get current document before update
    const before = await this.db.collection(collection).findOne(filter)
    if (!before) throw new Error("Document not found")

    const currentVersion = before.__v || 0

    // 2. Apply update with version increment
    const result = await this.db.collection(collection).findOneAndUpdate(
      { ...filter, __v: currentVersion },
      {
        ...update,
        $inc: { __v: 1 },
        $set: {
          ...(update.$set || {}),
          updatedAt: new Date(),
          updatedBy: context.userId
        }
      },
      { returnDocument: "after" }
    )

    if (!result) {
      throw new Error("Concurrent modification detected - please retry")
    }

    // 3. Write snapshot to history collection
    await this.db.collection(`${collection}_history`).insertOne({
      documentId: before._id,
      version: currentVersion + 1,
      snapshot: this.stripInternalFields(result),
      before: this.extractChangedFields(before, update.$set || {}),
      after: this.extractChangedFields(result, update.$set || {}),
      operation: "update",
      changedBy: context.userId,
      changedByEmail: context.userEmail,
      changedAt: new Date(),
      reason: context.reason || null,
      ipAddress: context.ipAddress || null
    })

    return result
  }

  async insertWithHistory(collection, document, context = {}) {
    const doc = {
      ...document,
      __v: 1,
      createdAt: new Date(),
      createdBy: context.userId,
      updatedAt: new Date(),
      updatedBy: context.userId
    }

    const result = await this.db.collection(collection).insertOne(doc)

    await this.db.collection(`${collection}_history`).insertOne({
      documentId: result.insertedId,
      version: 1,
      snapshot: this.stripInternalFields({ ...doc, _id: result.insertedId }),
      operation: "insert",
      changedBy: context.userId,
      changedByEmail: context.userEmail,
      changedAt: new Date(),
      reason: context.reason || null
    })

    return { ...doc, _id: result.insertedId }
  }

  async getHistory(collection, documentId, options = {}) {
    const { limit = 50, fromVersion, toVersion } = options
    const query = { documentId: new ObjectId(documentId) }

    if (fromVersion || toVersion) {
      query.version = {}
      if (fromVersion) query.version.$gte = fromVersion
      if (toVersion) query.version.$lte = toVersion
    }

    return this.db.collection(`${collection}_history`)
      .find(query)
      .sort({ version: -1 })
      .limit(limit)
      .toArray()
  }

  async getVersion(collection, documentId, version) {
    return this.db.collection(`${collection}_history`).findOne({
      documentId: new ObjectId(documentId),
      version
    })
  }

  stripInternalFields(doc) {
    const { __v, createdAt, updatedAt, createdBy, updatedBy, ...rest } = doc
    return rest
  }

  extractChangedFields(doc, changedFields) {
    const result = {}
    for (const key of Object.keys(changedFields)) {
      result[key] = doc[key]
    }
    return result
  }
}
```

### Usage

```javascript
const trail = new AuditTrailService(db)

// Insert with history
const product = await trail.insertWithHistory(
  "products",
  { name: "Widget Pro", price: 39.99, stock: 200 },
  { userId: "user-alice", userEmail: "alice@example.com", reason: "Initial listing" }
)

// Update with history
await trail.updateWithHistory(
  "products",
  { _id: product._id },
  { $set: { price: 49.99 } },
  { userId: "user-bob", userEmail: "bob@example.com", reason: "Q2 price increase" }
)

// Get document history
const history = await trail.getHistory("products", product._id)
history.forEach(h => {
  console.log(`v${h.version} by ${h.changedByEmail}: ${JSON.stringify(h.before)} -> ${JSON.stringify(h.after)}`)
})

// Get document at specific version
const v1 = await trail.getVersion("products", product._id, 1)
console.log("Price at v1:", v1.snapshot.price)  // 39.99
```

## Pattern 2 - Inline History Array (for Small Documents)

For documents that don't change frequently, store the history inline:

```javascript
// Inline history - good for documents with < 20 versions
{
  _id: ObjectId("..."),
  status: "active",
  plan: "pro",
  __v: 3,
  history: [
    {
      version: 1,
      changedBy: "user-alice",
      changedAt: ISODate("2026-01-15"),
      changes: { status: "trial", plan: "free" }
    },
    {
      version: 2,
      changedBy: "user-alice",
      changedAt: ISODate("2026-02-01"),
      changes: { status: "active", plan: "basic" }
    },
    {
      version: 3,
      changedBy: "admin",
      changedAt: ISODate("2026-03-01"),
      changes: { plan: "pro" }
    }
  ]
}
```

```javascript
async function updateWithInlineHistory(db, collection, id, changes, context) {
  // Read current version first to compute the new version number
  const current = await db.collection(collection).findOne({ _id: new ObjectId(id) })
  if (!current) throw new Error("Document not found")

  const newVersion = (current.__v || 0) + 1

  const result = await db.collection(collection).findOneAndUpdate(
    { _id: new ObjectId(id), __v: current.__v },
    {
      $set: changes,
      $inc: { __v: 1 },
      $push: {
        history: {
          version: newVersion,
          changedBy: context.userId,
          changedAt: new Date(),
          changes,
          reason: context.reason
        }
      }
    },
    { returnDocument: "after" }
  )

  if (!result) {
    throw new Error("Concurrent modification detected - please retry")
  }

  return result
}
```

## Restore to Previous Version

```javascript
async function restoreVersion(trail, collection, documentId, targetVersion, context) {
  const targetSnapshot = await trail.getVersion(collection, documentId, targetVersion)
  if (!targetSnapshot) throw new Error(`Version ${targetVersion} not found`)

  const current = await trail.db.collection(collection).findOne({
    _id: new ObjectId(documentId)
  })

  // Apply the snapshot as an update
  const { _id, ...snapshotData } = targetSnapshot.snapshot
  return trail.updateWithHistory(
    collection,
    { _id: new ObjectId(documentId) },
    { $set: snapshotData },
    {
      ...context,
      reason: `Restored to version ${targetVersion}`
    }
  )
}
```

## Indexes for Efficient History Queries

```javascript
// History collection indexes
db.products_history.createIndex({ documentId: 1, version: -1 })
db.products_history.createIndex({ changedBy: 1, changedAt: -1 })
db.products_history.createIndex({ changedAt: -1 })

// TTL - keep history for 2 years
db.products_history.createIndex(
  { changedAt: 1 },
  { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 }
)
```

## Summary

Audit trails in MongoDB are best implemented using a shadow history collection that stores version snapshots alongside the main document. Each update writes the changed fields and full snapshot to the history collection, enabling point-in-time reconstruction and diff calculations. For strict atomicity across both writes, wrap them in a multi-document transaction. Combined with a version counter and optimistic concurrency control, this pattern provides a complete, queryable record of every change to every document with author, timestamp, and reason captured at write time.
