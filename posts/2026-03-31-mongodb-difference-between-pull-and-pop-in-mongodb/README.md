# What Is the Difference Between $pull and $pop in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array, Update, Operator, Document

Description: $pull removes array elements matching a condition while $pop removes the first or last element by position - understanding both prevents accidental data loss.

---

## Overview

MongoDB provides two update operators for removing elements from arrays: `$pull` and `$pop`. They solve different problems - `$pull` is condition-based and `$pop` is position-based. Using the wrong one leads to unexpected results.

## The $pop Operator

`$pop` removes either the first or last element of an array. It accepts `-1` to remove the first element and `1` to remove the last.

```javascript
// Sample document
db.playlists.insertOne({
  _id: 1,
  name: "Morning Mix",
  songs: ["Song A", "Song B", "Song C", "Song D"]
})

// Remove the last element (Song D)
db.playlists.updateOne(
  { _id: 1 },
  { $pop: { songs: 1 } }
)

// Remove the first element (Song A)
db.playlists.updateOne(
  { _id: 1 },
  { $pop: { songs: -1 } }
)
```

`$pop` is useful for treating an array as a queue or stack. It always removes exactly one element per operation and does not accept conditions.

## The $pull Operator

`$pull` removes all array elements that match a specified condition or value. Unlike `$pop`, it can remove multiple elements in a single operation.

```javascript
// Sample document
db.users.insertOne({
  _id: 1,
  username: "alice",
  roles: ["viewer", "editor", "admin", "editor"]
})

// Remove a specific value from the array
db.users.updateOne(
  { _id: 1 },
  { $pull: { roles: "editor" } }
)
// Result: roles becomes ["viewer", "admin"]
// Both "editor" entries are removed

// Remove elements matching a condition (for arrays of objects or numbers)
db.inventory.updateOne(
  { _id: 42 },
  { $pull: { items: { quantity: { $lt: 5 } } } }
)
```

### Pulling from Arrays of Documents

`$pull` works with arrays of embedded documents:

```javascript
db.orders.insertOne({
  _id: 101,
  lineItems: [
    { sku: "ABC", qty: 2 },
    { sku: "DEF", qty: 0 },
    { sku: "GHI", qty: 0 }
  ]
})

// Remove all line items with zero quantity
db.orders.updateOne(
  { _id: 101 },
  { $pull: { lineItems: { qty: 0 } } }
)
// Result: lineItems contains only { sku: "ABC", qty: 2 }
```

## Key Differences

| Feature | $pop | $pull |
|---|---|---|
| Removal basis | Position (first or last) | Value or condition |
| Number removed | Always exactly 1 | All matching elements |
| Accepts conditions | No | Yes |
| Matches nested doc fields | No | Yes |
| Use case | Queue/stack operations | Data cleanup, filtering |

## Using $pullAll

For removing multiple specific values at once, use `$pullAll`:

```javascript
// Remove specific known values from an array
db.users.updateOne(
  { _id: 1 },
  { $pullAll: { roles: ["editor", "viewer"] } }
)
```

`$pullAll` is equivalent to running `$pull` with an `$in` condition but is more concise for fixed value lists.

## Practical Patterns

### Queue Pattern with $pop

```javascript
// Process and remove the next item from a work queue
const result = db.queue.findOneAndUpdate(
  { status: "pending" },
  { $pop: { tasks: -1 } },
  { returnDocument: "before" }
)
// The first task from the returned document is the one to process
```

### Cleanup Pattern with $pull

```javascript
// Remove expired session tokens
db.sessions.updateMany(
  {},
  { $pull: { tokens: { expiresAt: { $lt: new Date() } } } }
)
```

## Common Mistakes

A common mistake is using `$pop` when you mean to remove a specific value. For example, if you want to remove a particular tag from a document, `$pop` would remove the wrong element unless it happens to be first or last. Always use `$pull` when targeting by value.

```javascript
// Wrong: removes last tag regardless of value
db.posts.updateOne({ _id: 1 }, { $pop: { tags: 1 } })

// Correct: removes the specific tag "deprecated"
db.posts.updateOne({ _id: 1 }, { $pull: { tags: "deprecated" } })
```

## Summary

`$pop` removes elements by position (first or last), making it ideal for queue and stack data structures. `$pull` removes elements by value or condition and can remove multiple elements in one operation, making it the right choice for data cleanup, removing specific entries, and filtering arrays. Use `$pullAll` when removing a fixed set of known values.
