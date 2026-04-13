# How to Use Ordered vs Unordered Bulk Writes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Write, Performance, Error Handling, BulkWrite

Description: Understand the difference between ordered and unordered bulk writes in MongoDB and when to use each for maximum performance and reliability.

---

## What Is a Bulk Write?

Bulk writes allow you to send multiple write operations (insert, update, delete, replace) to MongoDB in a single network round trip. This dramatically reduces latency compared to issuing operations individually.

MongoDB's `bulkWrite()` method accepts an array of operations and an options object:

```javascript
db.collection.bulkWrite(operations, options)
```

The key option is `ordered`, which controls how errors are handled.

## Ordered Bulk Writes (default)

By default, `bulkWrite` is ordered. Operations execute sequentially. If one fails, the entire batch stops at that point - remaining operations are not executed.

```javascript
db.products.bulkWrite([
  { insertOne: { document: { _id: 1, name: "Widget A", stock: 100 } } },
  { insertOne: { document: { _id: 2, name: "Widget B", stock: 50 } } },
  { updateOne: {
      filter: { _id: 1 },
      update: { $inc: { stock: -10 } }
  }},
  { deleteOne: { filter: { _id: 999 } } }
], { ordered: true })  // default behavior
```

If the second `insertOne` fails (duplicate key), the `updateOne` and `deleteOne` never run.

## Unordered Bulk Writes

With `ordered: false`, operations can execute in any order and in parallel. A failure in one operation does not stop the remaining operations from executing.

```javascript
db.products.bulkWrite([
  { insertOne: { document: { _id: 1, name: "Widget A", stock: 100 } } },
  { insertOne: { document: { _id: 2, name: "Widget B", stock: 50 } } },
  { insertOne: { document: { _id: 3, name: "Widget C", stock: 75 } } }
], { ordered: false })
```

Even if `_id: 2` already exists, the inserts for `_id: 1` and `_id: 3` still succeed.

## Performance Comparison

Unordered bulk writes are generally faster because MongoDB can pipeline and parallelize them:

```javascript
const operations = []
for (let i = 0; i < 10000; i++) {
  operations.push({
    insertOne: {
      document: { userId: i, value: Math.random(), createdAt: new Date() }
    }
  })
}

console.time("ordered")
await db.collection("data").bulkWrite(operations, { ordered: true })
console.timeEnd("ordered")

console.time("unordered")
await db.collection("data").bulkWrite(operations, { ordered: false })
console.timeEnd("unordered")
// Unordered is typically 2-5x faster for large batches
```

## Handling the Result Object

The `bulkWrite` result contains counts for each operation type:

```javascript
const result = await db.collection("orders").bulkWrite([
  { insertOne: { document: { item: "abc", qty: 10 } } },
  { updateOne: { filter: { item: "xyz" }, update: { $set: { status: "sold" } } } },
  { deleteOne: { filter: { item: "old" } } }
])

console.log(result.insertedCount)   // number of successful inserts
console.log(result.modifiedCount)   // number of documents modified
console.log(result.deletedCount)    // number of documents deleted
console.log(result.upsertedCount)   // number of upserted documents
console.log(result.upsertedIds)     // map of index to _id for upserts
```

## Error Handling

For ordered bulk writes, catch errors and check which operation failed:

```javascript
try {
  await db.collection("items").bulkWrite([
    { insertOne: { document: { _id: 1, name: "A" } } },
    { insertOne: { document: { _id: 1, name: "Duplicate" } } },  // fails
    { insertOne: { document: { _id: 2, name: "B" } } }           // never runs
  ], { ordered: true })
} catch (err) {
  err.writeErrors.forEach(writeErr => {
    console.error("Failed at operation index:", writeErr.index)
    console.error("Error code:", writeErr.code)
  })
  console.log("Inserted before failure:", err.result.insertedCount)
}
```

For unordered bulk writes, errors are collected and thrown after all operations complete:

```javascript
try {
  await db.collection("items").bulkWrite(operations, { ordered: false })
} catch (err) {
  // err.writeErrors is an array of all individual errors
  err.writeErrors.forEach(writeErr => {
    console.error(`Op ${writeErr.index}: ${writeErr.errmsg}`)
  })
  // Successful operations were still applied
  console.log("Inserted:", err.result.insertedCount)
}
```

## When to Use Each Mode

Use **ordered** when:
- Operations have dependencies (insert then update the same document)
- You need all-or-nothing semantics within a portion of the batch
- Order matters for business logic

Use **unordered** when:
- Operations are independent of each other
- Maximum throughput is the priority
- You want to continue despite partial failures (e.g., skipping duplicate inserts)

## Summary

Ordered bulk writes execute sequentially and stop on the first error, while unordered bulk writes execute in parallel and collect all errors without stopping. Choose ordered when operations depend on each other, and unordered for independent operations where throughput matters. Both modes return a detailed result object that reports inserted, modified, deleted, and upserted counts.
