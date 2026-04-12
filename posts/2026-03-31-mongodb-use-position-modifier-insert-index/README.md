# How to Use $position Modifier to Insert at a Specific Index in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array Modifier, Update Operator, Document

Description: Learn how MongoDB's $position modifier inserts elements at a specific index within an array using $push and $each, enabling prepend and arbitrary insertion patterns.

---

## What Is the $position Modifier?

The `$position` modifier tells `$push` where to insert new elements in an array. By default, `$push` appends to the end. With `$position`, you can insert at the beginning (index 0), the end, or any arbitrary position. This modifier requires `$each` to be present.

## Basic Syntax

```javascript
db.collection.updateOne(
  { <filter> },
  {
    $push: {
      <arrayField>: {
        $each: [<value1>, <value2>],
        $position: <index>
      }
    }
  }
)
```

- `0` inserts at the beginning (prepend)
- `n` inserts before the element at index `n`
- Negative values count from the end of the array

## Example: Prepending to an Array

```javascript
// Document: { _id: 1, tasks: ["b", "c", "d"] }

db.queues.updateOne(
  { _id: 1 },
  {
    $push: {
      tasks: {
        $each: ["a"],
        $position: 0
      }
    }
  }
)
// tasks becomes: ["a", "b", "c", "d"]
```

## Inserting Multiple Elements at Position 0

```javascript
db.queues.updateOne(
  { _id: 1 },
  {
    $push: {
      tasks: {
        $each: ["x", "y"],
        $position: 0
      }
    }
  }
)
// tasks becomes: ["x", "y", "a", "b", "c", "d"]
```

Elements are inserted in order starting at the given position.

## Inserting at a Specific Index

```javascript
// tasks: ["a", "b", "d", "e"]
db.queues.updateOne(
  { _id: 1 },
  {
    $push: {
      tasks: {
        $each: ["c"],
        $position: 2
      }
    }
  }
)
// tasks becomes: ["a", "b", "c", "d", "e"]
```

## Using Negative $position

Negative indices insert relative to the end of the array.

```javascript
// scores: [10, 20, 30, 40]
db.results.updateOne(
  { _id: 1 },
  {
    $push: {
      scores: {
        $each: [25],
        $position: -2
      }
    }
  }
)
// scores becomes: [10, 20, 25, 30, 40]
```

`-2` means "two positions from the end," inserting before the second-to-last element.

## Combining $position with $slice

Insert at a specific position and then trim the array.

```javascript
db.notifications.updateOne(
  { userId: "user-1" },
  {
    $push: {
      alerts: {
        $each: [{ msg: "New message", ts: new Date() }],
        $position: 0,
        $slice: 10
      }
    }
  }
)
```

This prepends the new alert and keeps only the 10 most recent (first 10 after prepend).

## Priority Queue Pattern

Use `$position: 0` to implement a simple priority queue where urgent tasks are prepended.

```javascript
async function addUrgentTask(taskId, description) {
  await db.workQueues.updateOne(
    { _id: "main-queue" },
    {
      $push: {
        pending: {
          $each: [{ id: taskId, desc: description, priority: "urgent" }],
          $position: 0
        }
      }
    }
  )
}
```

## Limitations

- `$position` cannot be used without `$each`.
- When `$position` and `$sort` are both specified in the same `$push` operation, elements are inserted at the given position first, then the entire array is sorted.

## Summary

The `$position` modifier gives precise control over where new elements land in a MongoDB array. Use it with `$position: 0` to prepend elements for priority queue patterns, or specify any index for ordered insertions. Combined with `$slice`, it creates bounded arrays that always accept new items at a controlled location.
