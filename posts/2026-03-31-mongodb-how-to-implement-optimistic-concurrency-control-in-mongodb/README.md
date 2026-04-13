# How to Implement Optimistic Concurrency Control in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Concurrency, Optimistic Locking, Versioning, Transaction

Description: Implement optimistic concurrency control in MongoDB using document versioning to prevent lost updates when multiple clients modify the same document.

---

## Overview

Optimistic Concurrency Control (OCC) assumes that conflicts are rare and allows multiple clients to read a document simultaneously. When a client writes, it checks that the document hasn't been modified since it was read. If it has, the write is rejected and the client must retry. This approach avoids locking and is more scalable than pessimistic locking for read-heavy workloads.

## The Lost Update Problem

```javascript
// Without OCC - two clients read the same document:
// Client A reads: { balance: 100, version: 1 }
// Client B reads: { balance: 100, version: 1 }
// Client A updates balance to 150 (adds 50)
// Client B updates balance to 80 (subtracts 20 from its stale read of 100)
// Result: 80 instead of correct value of 130 - LOST UPDATE
```

## Solution - Version-Based OCC

### Add a Version Field to Documents

```javascript
// Schema includes a version field
{
  _id: ObjectId("..."),
  name: "Alice",
  balance: 100,
  __v: 1,                // version counter
  updatedAt: ISODate("...")
}
```

### Read-Modify-Write Pattern

```javascript
async function updateWithOCC(db, collection, docId, updateFn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 1. Read the current document
    const doc = await db.collection(collection).findOne({ _id: docId })
    if (!doc) throw new Error("Document not found")

    const currentVersion = doc.__v

    // 2. Apply changes in memory
    const updatedDoc = await updateFn(doc)

    // 3. Write with version check (atomic)
    const { _id, __v, ...changes } = updatedDoc

    const result = await db.collection(collection).updateOne(
      {
        _id: docId,
        __v: currentVersion  // Only update if version matches
      },
      {
        $set: {
          ...changes,
          updatedAt: new Date()
        },
        $inc: { __v: 1 }  // Increment version
      }
    )

    if (result.modifiedCount === 1) {
      return { ...updatedDoc, __v: currentVersion + 1 }
    }

    // Version mismatch - another client updated the document
    console.log(`Conflict on attempt ${attempt + 1}, retrying...`)
    await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)))
  }

  throw new Error(`Failed to update after ${maxRetries} attempts due to concurrent modifications`)
}

// Usage
const updatedUser = await updateWithOCC(
  db,
  "accounts",
  userId,
  (doc) => ({ ...doc, balance: doc.balance + 50 })
)
```

### Practical Example - Inventory Decrement

```javascript
async function decrementStock(db, productId, quantity) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const product = await db.collection("products").findOne({
      _id: new ObjectId(productId)
    })

    if (!product) throw new Error("Product not found")
    if (product.stock < quantity) throw new Error("Insufficient stock")

    const result = await db.collection("products").updateOne(
      {
        _id: new ObjectId(productId),
        __v: product.__v,
        stock: { $gte: quantity }  // Double-check stock in the predicate
      },
      {
        $inc: {
          stock: -quantity,
          __v: 1
        },
        $set: { updatedAt: new Date() }
      }
    )

    if (result.modifiedCount === 1) {
      console.log(`Stock decremented successfully (attempt ${attempt + 1})`)
      return true
    }

    // Conflict - retry
    const backoff = Math.pow(2, attempt) * 10
    await new Promise(r => setTimeout(r, backoff))
  }

  throw new Error("Stock update failed due to concurrent modifications")
}
```

## Using ETags with MongoDB (REST API Pattern)

```javascript
// GET /api/products/:id
app.get("/api/products/:id", async (req, res) => {
  const product = await db.collection("products").findOne({
    _id: new ObjectId(req.params.id)
  })

  if (!product) return res.status(404).json({ error: "Not found" })

  // Use version as ETag
  res.setHeader("ETag", `"${product.__v}"`)
  res.json(product)
})

// PUT /api/products/:id - requires If-Match header
app.put("/api/products/:id", async (req, res) => {
  const ifMatch = req.headers["if-match"]
  if (!ifMatch) {
    return res.status(428).json({ error: "If-Match header required" })
  }

  const expectedVersion = parseInt(ifMatch.replace(/"/g, ""))

  const result = await db.collection("products").updateOne(
    {
      _id: new ObjectId(req.params.id),
      __v: expectedVersion
    },
    {
      $set: { ...req.body, updatedAt: new Date() },
      $inc: { __v: 1 }
    }
  )

  if (result.modifiedCount === 0) {
    return res.status(409).json({
      error: "Conflict - document was modified by another request",
      hint: "Refetch the document and retry"
    })
  }

  res.json({ success: true })
})
```

## Using Timestamps Instead of Version Counters

```javascript
async function updateWithTimestampOCC(db, id, updates, lastKnownUpdatedAt) {
  const result = await db.collection("items").findOneAndUpdate(
    {
      _id: new ObjectId(id),
      updatedAt: lastKnownUpdatedAt  // Timestamp as version
    },
    {
      $set: {
        ...updates,
        updatedAt: new Date()
      }
    },
    { returnDocument: "after" }
  )

  if (!result) {
    throw new Error("Concurrent modification detected")
  }

  return result
}
```

## Detect and Handle Conflicts in Frontend

```javascript
// React component example
async function updateProfile(userId, changes) {
  const response = await fetch(`/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "If-Match": `"${currentVersion}"`
    },
    body: JSON.stringify(changes)
  })

  if (response.status === 409) {
    // Conflict - refetch and show merge dialog
    const fresh = await fetch(`/api/users/${userId}`).then(r => r.json())
    showConflictDialog(fresh, changes)
    return
  }

  if (!response.ok) {
    throw new Error("Update failed")
  }

  return response.json()
}
```

## When to Use OCC vs Transactions

```javascript
// Use OCC for:
// - Simple read-modify-write on a single document
// - High read-to-write ratios
// - Distributed systems where lock contention is expensive

// Use MongoDB transactions for:
// - Updates spanning multiple documents/collections
// - Complex business logic that must be atomic
// - When conflicts would be hard to resolve

const session = client.startSession()
await session.withTransaction(async () => {
  await db.collection("orders").insertOne({ items: [...], total: 100 }, { session })
  await db.collection("inventory").updateOne(
    { productId: "p1" }, { $inc: { stock: -1 } }, { session }
  )
})
```

## Summary

Optimistic Concurrency Control in MongoDB uses a version field (`__v`) combined with a conditional update (`updateOne` with version in the filter) to detect concurrent modifications. If `modifiedCount` is 0, a conflict occurred and the client retries with an exponential backoff. This pattern avoids database-level locks, scales well for read-heavy workloads, and pairs naturally with REST API ETags and `If-Match` headers for HTTP-based conflict detection.
