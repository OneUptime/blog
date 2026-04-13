# How to Choose Between Ordered and Unordered Bulk Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Write, Performance, Error Handling, BulkWrite

Description: Learn the trade-offs between ordered and unordered MongoDB bulk operations and a practical framework for choosing the right mode for each use case.

---

## The Core Difference

MongoDB bulk write operations have two modes:

**Ordered** (`ordered: true` - default)
- Operations execute sequentially in array order
- First failure stops the batch immediately
- Remaining operations are not attempted
- Slightly slower due to sequential execution

**Unordered** (`ordered: false`)
- Operations may execute in any order, potentially in parallel
- Failures are collected but do not stop other operations
- All non-failing operations are applied
- Generally faster, especially for large batches

## Decision Framework

Use this checklist to choose:

```text
Use ORDERED when:
  - Operations depend on each other (insert then update same document)
  - You need stop-on-first-error semantics
  - Order matters for business logic
  - You are implementing a sequence of steps that must all succeed

Use UNORDERED when:
  - Operations are independent of each other
  - Maximum throughput is important
  - Partial success is acceptable (e.g., skip duplicates)
  - You are importing/syncing data where some records may already exist
```

## Ordered: Sequential with Dependencies

```javascript
// Example: create user, then create their initial settings
// These MUST be ordered - settings depends on user existing
const result = await db.collection("users").bulkWrite([
  {
    insertOne: {
      document: {
        _id: "user123",
        email: "alice@example.com",
        createdAt: new Date()
      }
    }
  }
], { ordered: true })  // explicit, though it's the default

// Then in a second operation (or separate collection)
await db.collection("userSettings").bulkWrite([
  {
    insertOne: {
      document: {
        userId: "user123",
        theme: "dark",
        notifications: true
      }
    }
  }
], { ordered: true })
```

## Unordered: Independent with Better Throughput

```javascript
// Import 50,000 product records - all independent
const operations = products.map(product => ({
  updateOne: {
    filter: { sku: product.sku },
    update: { $set: product },
    upsert: true
  }
}))

// Unordered is significantly faster for large independent batches
const result = await db.collection("products").bulkWrite(
  operations,
  { ordered: false }
)

console.log("Upserted:", result.upsertedCount)
console.log("Modified:", result.modifiedCount)
```

## Performance Benchmark

```javascript
const documents = Array.from({ length: 10000 }, (_, i) => ({
  insertOne: { document: { _id: i, value: Math.random() } }
}))

// Ordered
console.time("ordered")
await db.collection("test").bulkWrite(documents, { ordered: true })
console.timeEnd("ordered")
// ~1200ms

await db.collection("test").drop()

// Unordered
console.time("unordered")
await db.collection("test").bulkWrite(documents, { ordered: false })
console.timeEnd("unordered")
// ~450ms (typically 2-3x faster)
```

## Mixed Operations: When Ordering Matters

```javascript
// WRONG: unordered - update may run before insert
await db.collection("sessions").bulkWrite([
  { insertOne: { document: { _id: "sess1", userId: "user1", active: true } } },
  { updateOne: {
      filter: { _id: "sess1" },
      update: { $set: { lastAccess: new Date() } }
  }}
], { ordered: false })  // update might execute first - finds nothing!

// CORRECT: ordered guarantees insert runs before update
await db.collection("sessions").bulkWrite([
  { insertOne: { document: { _id: "sess1", userId: "user1", active: true } } },
  { updateOne: {
      filter: { _id: "sess1" },
      update: { $set: { lastAccess: new Date() } }
  }}
], { ordered: true })
```

## Error Handling Differences

```javascript
const operations = [
  { insertOne: { document: { _id: 1, name: "A" } } },
  { insertOne: { document: { _id: 1, name: "Duplicate" } } },  // fails
  { insertOne: { document: { _id: 2, name: "C" } } }
]

// ORDERED: stops at index 1
try {
  await db.collection("items").bulkWrite(operations, { ordered: true })
} catch (err) {
  console.log("Failed at index:", err.writeErrors[0].index)  // 1
  console.log("Docs inserted:", err.result.insertedCount)  // 1 (only _id:1 succeeded)
}

// UNORDERED: all non-failing ops run
try {
  await db.collection("items").bulkWrite(operations, { ordered: false })
} catch (err) {
  console.log("Write errors:", err.writeErrors.length)  // 1
  console.log("Docs inserted:", err.result.insertedCount)  // 2 (_id:1 and _id:2 both inserted)
}
```

## Hybrid Pattern: Ordered Within Unordered Groups

For workloads where some operations have dependencies but most do not:

```javascript
// Group related operations together, keep groups unordered
async function hybridBulkWrite(collection, orderedGroups) {
  const results = []
  await Promise.all(
    orderedGroups.map(async group => {
      // Each group runs ordered internally
      const result = await collection.bulkWrite(group, { ordered: true })
      results.push(result)
    })
  )
  return results
}

// Group 1: user setup (ordered)
// Group 2: product updates (ordered within group)
// Groups run in parallel (effectively unordered between groups)
await hybridBulkWrite(db.collection("data"), [
  [
    { insertOne: { document: { _id: "user1" } } },
    { insertOne: { document: { userId: "user1", settings: {} } } }
  ],
  [
    { updateOne: { filter: { sku: "A" }, update: { $set: { price: 10 } } } },
    { updateOne: { filter: { sku: "B" }, update: { $set: { price: 20 } } } }
  ]
])
```

## Summary

Choose ordered bulk writes when operations depend on each other or when stop-on-first-error semantics are required. Choose unordered for independent operations where throughput matters and partial success is acceptable - it is typically 2-3x faster for large batches. For mixed workloads, group dependent operations into ordered sub-batches and run those sub-batches in parallel.
