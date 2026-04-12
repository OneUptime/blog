# How to Implement a Stack with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Stack, Data Structure, Pattern, Array

Description: Learn how to implement a stack data structure in MongoDB using array operators for LIFO (last-in, first-out) access patterns.

---

## Stack Operations in MongoDB

A stack is a LIFO (last-in, first-out) data structure with two primary operations: push (add to top) and pop (remove from top). MongoDB's atomic array operators make it possible to implement both operations without race conditions.

## Document Schema

A stack can be stored as an array field in a document:

```javascript
{
  "_id": "undo-history-user-123",
  "items": [
    { "action": "insert", "data": { "title": "First item" }, "timestamp": ISODate("2026-03-31T09:00:00Z") },
    { "action": "update", "data": { "title": "Updated item" }, "timestamp": ISODate("2026-03-31T09:05:00Z") }
  ],
  "maxSize": 50
}
```

The last element of the array is the "top" of the stack.

## Push Operation

Use `$push` to add an item to the top (end) of the array:

```javascript
db.stacks.updateOne(
  { _id: "undo-history-user-123" },
  {
    $push: {
      items: {
        $each: [{ "action": "delete", "data": { "id": "xyz" }, "timestamp": new Date() }]
      }
    }
  },
  { upsert: true }
)
```

Simplified push (append to end):

```javascript
db.stacks.updateOne(
  { _id: "undo-history-user-123" },
  {
    $push: { items: { "action": "delete", "timestamp": new Date() } }
  }
)
```

## Push with Size Limit

Use `$slice` to enforce a maximum stack size (keep only the last N items):

```javascript
db.stacks.updateOne(
  { _id: "undo-history-user-123" },
  {
    $push: {
      items: {
        $each: [{ "action": "update", "timestamp": new Date() }],
        $slice: -50  // keep only the last 50 items
      }
    }
  }
)
```

## Pop Operation (Atomic)

Use `findOneAndUpdate` with `$pop` to atomically remove and return the top item:

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client.myDatabase

def pop(stack_id: str) -> dict | None:
    result = db.stacks.find_one_and_update(
        {"_id": stack_id, "items.0": {"$exists": True}},
        {"$pop": {"items": 1}},  # 1 removes from end (top), -1 removes from start (bottom)
        return_document=False  # return the document BEFORE the update
    )
    if result and result.get("items"):
        return result["items"][-1]  # last item was the top
    return None
```

## Peek Operation (Non-Destructive)

Read the top item without removing it:

```python
def peek(stack_id: str) -> dict | None:
    result = db.stacks.find_one(
        {"_id": stack_id},
        {"items": {"$slice": -1}}  # return only the last element
    )
    if result and result.get("items"):
        return result["items"][0]
    return None
```

## Stack Size

```python
def size(stack_id: str) -> int:
    results = list(db.stacks.aggregate([
        {"$match": {"_id": stack_id}},
        {"$project": {"count": {"$size": "$items"}}}
    ]))
    return results[0].get("count", 0) if results else 0
```

## Practical Example: Undo Stack

```python
def push_undo(user_id: str, action: str, payload: dict) -> None:
    db.stacks.update_one(
        {"_id": f"undo-{user_id}"},
        {
            "$push": {
                "items": {
                    "$each": [{"action": action, "payload": payload}],
                    "$slice": -100
                }
            }
        },
        upsert=True
    )

def undo(user_id: str) -> dict | None:
    return pop(f"undo-{user_id}")
```

## Multiple Stacks Per Document

For per-user or per-session stacks, embed stacks in user documents:

```javascript
db.users.updateOne(
  { _id: "user-123" },
  { $push: { "history": { action: "edit", ts: new Date() } } }
)
```

## Summary

MongoDB implements stacks cleanly with `$push` to add items and `$pop` with `findOneAndUpdate` to atomically remove and return the top. Use `$slice` in `$push` to enforce a maximum size, and `$slice: -1` in a projection to peek at the top without modifying the stack. This pattern is well-suited for undo histories, navigation stacks, and call stacks in workflow systems.
