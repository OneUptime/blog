# How to Use initializeUnorderedBulkOp() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Write, initializeUnorderedBulkOp, Performance, Shell

Description: Learn how to use MongoDB's initializeUnorderedBulkOp() method to batch multiple write operations for high-throughput parallel execution.

---

## What Is initializeUnorderedBulkOp()?

`initializeUnorderedBulkOp()` is a legacy MongoDB shell method that creates a bulk write builder. Unlike `insertMany()` or `bulkWrite()`, it provides a fluent API to build up a batch of operations step by step before executing them all at once.

Operations added to an unordered bulk op:
- Execute in any order (possibly in parallel)
- Do not stop on failure - all operations attempt to run
- Report all errors after completion

Note: In modern applications, `bulkWrite()` is preferred, but `initializeUnorderedBulkOp()` is still available and widely used in shell scripts and older codebases.

## Basic Usage in mongosh

```javascript
// Initialize an unordered bulk operation
const bulk = db.products.initializeUnorderedBulkOp()

// Add operations to the batch
bulk.insert({ _id: 1, name: "Widget A", price: 9.99, stock: 100 })
bulk.insert({ _id: 2, name: "Widget B", price: 14.99, stock: 50 })
bulk.insert({ _id: 3, name: "Widget C", price: 19.99, stock: 75 })

// Execute all operations in one batch
const result = bulk.execute()
console.log("Inserted:", result.nInserted)
```

## Adding Mixed Operations

```javascript
const bulk = db.inventory.initializeUnorderedBulkOp()

// Inserts
bulk.insert({ sku: "SKU-001", qty: 100, location: "A1" })
bulk.insert({ sku: "SKU-002", qty: 50, location: "B2" })

// Updates
bulk.find({ sku: "SKU-003" }).updateOne({ $inc: { qty: 25 } })
bulk.find({ sku: "SKU-004" }).upsert().updateOne({
  $setOnInsert: { sku: "SKU-004", location: "C3" },
  $set: { qty: 10 }
})

// Removes
bulk.find({ qty: 0 }).remove()  // remove all with qty: 0
bulk.find({ sku: "SKU-OBSOLETE" }).removeOne()

// Execute all at once
const result = bulk.execute()
print("Inserted:", result.nInserted)
print("Modified:", result.nModified)
print("Deleted:", result.nRemoved)
print("Upserted:", result.nUpserted)
```

## Upserts with initializeUnorderedBulkOp

Use `.upsert()` before `.updateOne()` or `.update()` to insert when no match is found:

```javascript
const bulk = db.users.initializeUnorderedBulkOp()

const userUpdates = [
  { email: "alice@example.com", name: "Alice", status: "active" },
  { email: "bob@example.com", name: "Bob", status: "inactive" },
  { email: "carol@example.com", name: "Carol", status: "active" }
]

userUpdates.forEach(user => {
  bulk.find({ email: user.email })
    .upsert()
    .updateOne({
      $setOnInsert: { createdAt: new Date() },
      $set: { name: user.name, status: user.status }
    })
})

const result = bulk.execute()
print("Upserted:", result.nUpserted)
print("Modified:", result.nModified)
```

## Handling Errors

Unordered bulk operations collect all errors. Inspect them after execution:

```javascript
const bulk = db.items.initializeUnorderedBulkOp()

bulk.insert({ _id: 1, name: "A" })
bulk.insert({ _id: 1, name: "Duplicate" })  // will fail
bulk.insert({ _id: 2, name: "B" })

try {
  bulk.execute()
} catch (err) {
  if (err.hasWriteErrors()) {
    err.getWriteErrors().forEach(writeErr => {
      print("Error at index", writeErr.index, ":", writeErr.errmsg)
    })
  }
  print("Total write errors:", err.getWriteErrorCount())

  // Successful operations still counted
  const result = err.getResult()
  print("Inserted despite errors:", result.nInserted)
}
```

## Difference from initializeOrderedBulkOp

```javascript
// Ordered bulk op: stops at first error
const orderedBulk = db.collection.initializeOrderedBulkOp()
orderedBulk.insert({ _id: 1 })
orderedBulk.insert({ _id: 1 })  // fails - stops here
orderedBulk.insert({ _id: 2 })  // NEVER RUNS

// Unordered bulk op: runs everything, collects errors
const unorderedBulk = db.collection.initializeUnorderedBulkOp()
unorderedBulk.insert({ _id: 1 })
unorderedBulk.insert({ _id: 1 })  // fails - but continues
unorderedBulk.insert({ _id: 2 })  // RUNS regardless
```

## Modern Equivalent: bulkWrite()

For new applications, prefer `bulkWrite()` over `initializeUnorderedBulkOp()`:

```javascript
// Legacy approach
const bulk = db.products.initializeUnorderedBulkOp()
bulk.insert({ name: "A", price: 10 })
bulk.find({ name: "B" }).updateOne({ $set: { price: 20 } })
bulk.execute()

// Modern equivalent (preferred)
await db.collection("products").bulkWrite([
  { insertOne: { document: { name: "A", price: 10 } } },
  { updateOne: { filter: { name: "B" }, update: { $set: { price: 20 } } } }
], { ordered: false })
```

## Batch Size Limit

MongoDB automatically splits bulk operations into batches of up to 100,000 operations (the server's `maxWriteBatchSize` limit). You can add any number of operations to a single bulk object and the driver handles batching internally. For very large datasets, manually batching can help manage memory usage:

```javascript
function bulkInBatches(collection, documents, batchSize = 10000) {
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize)
    const bulk = collection.initializeUnorderedBulkOp()
    batch.forEach(doc => bulk.insert(doc))
    bulk.execute()
    print(`Processed ${Math.min(i + batchSize, documents.length)} / ${documents.length}`)
  }
}
```

## Summary

`initializeUnorderedBulkOp()` provides a fluent builder API for batching MongoDB write operations that execute in parallel without stopping on individual failures. Use it for mixed insert/update/delete batches where operation order does not matter and partial success is acceptable. For modern Node.js applications, the `bulkWrite()` method offers the same functionality with a cleaner promise-based interface.
