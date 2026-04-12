# How to Use $pop to Remove the First or Last Element from an Array in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array Operator, Update Operator, Document

Description: Learn how MongoDB's $pop operator removes the first or last element from an array field using -1 or 1, making it simple to implement queue and stack operations.

---

## What Is the $pop Operator?

The `$pop` operator removes either the first or the last element from an array in a MongoDB document. It takes a value of `1` to remove the last element, or `-1` to remove the first element. This makes it useful for implementing stack (LIFO) and queue (FIFO) patterns directly at the database layer.

## Basic Syntax

```javascript
db.collection.updateOne(
  { <filter> },
  { $pop: { <arrayField>: 1 | -1 } }
)
```

- `1` removes the last element (like a stack pop)
- `-1` removes the first element (like a queue dequeue)

## Example: Removing the Last Element

```javascript
// Document: { _id: 1, queue: ["a", "b", "c", "d"] }

db.tasks.updateOne(
  { _id: 1 },
  { $pop: { queue: 1 } }
)
// queue becomes: ["a", "b", "c"]
```

## Example: Removing the First Element

```javascript
db.tasks.updateOne(
  { _id: 1 },
  { $pop: { queue: -1 } }
)
// queue becomes: ["b", "c", "d"]
```

## Implementing a Fixed-Size Log with $pop

```javascript
// Add a new log entry, then trim the oldest
db.servers.updateOne(
  { _id: "server-1" },
  { $push: { recentLogs: newLogEntry } }
)

// If logs exceed 100, remove the oldest
db.servers.updateOne(
  { _id: "server-1", "recentLogs.100": { $exists: true } },
  { $pop: { recentLogs: -1 } }
)
```

A cleaner approach is to use `$push` with `$slice` in the same operation.

## Popping from Nested Arrays

Use dot notation to target arrays inside embedded documents.

```javascript
db.orders.updateOne(
  { _id: "order-5" },
  { $pop: { "history.changes": 1 } }
)
```

## Behavior on Empty Arrays

If the array is empty, `$pop` has no effect and does not raise an error.

## Behavior When Field Does Not Exist

If the target field does not exist, `$pop` also has no effect.

## $pop vs findOneAndUpdate for Queue Patterns

For true queue semantics where you need to retrieve and remove atomically, use `findOneAndUpdate`:

```javascript
const item = await db.queues.findOneAndUpdate(
  { _id: "work-queue" },
  { $pop: { jobs: -1 } },
  { returnDocument: "before" }
)
// item.jobs[0] is the dequeued job
```

## $pop vs $pull

| Feature | $pop | $pull |
|---------|------|-------|
| Removes by position | Yes (first or last) | No |
| Removes by value | No | Yes |
| Use case | Queue/stack operations | Value-based removal |

## Summary

The `$pop` operator provides a positional way to remove the first or last element from an array, enabling straightforward queue and stack operations in MongoDB. Combined with `findOneAndUpdate`, it supports atomic dequeue patterns. For value-based removal, use `$pull` or `$pullAll` instead.
