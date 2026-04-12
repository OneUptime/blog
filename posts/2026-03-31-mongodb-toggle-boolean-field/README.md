# How to Toggle a Boolean Field in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, Boolean, Aggregation, Operator

Description: Learn how to toggle a boolean field in MongoDB using aggregation pipeline updates with $not, avoiding the read-modify-write anti-pattern.

---

Toggling a boolean field (flipping `true` to `false` and vice versa) requires knowing the current value before setting the new one. MongoDB's aggregation pipeline update syntax (available since MongoDB 4.2) enables server-side conditional logic, making atomic boolean toggles possible without a round-trip read.

## The Naive Approach (Non-Atomic)

Reading the current value and then setting the opposite is not atomic:

```javascript
// NOT ATOMIC - race condition risk
const doc = await db.collection("posts").findOne({ _id: postId });
const newValue = !doc.isPublished;
await db.collection("posts").updateOne(
  { _id: postId },
  { $set: { isPublished: newValue } }
);
```

## Atomic Toggle with Aggregation Pipeline Update

Use a pipeline update with `$not` to flip the boolean server-side:

```javascript
db.posts.updateOne(
  { _id: postId },
  [
    {
      $set: {
        isPublished: { $not: ["$isPublished"] }
      }
    }
  ]
)
```

The `[...]` array syntax signals an aggregation pipeline update. `$not` inside `$set` operates on the document's current `isPublished` value, flipping it atomically.

## Toggle with Timestamp

Track when the toggle occurred:

```javascript
db.features.updateOne(
  { _id: featureId },
  [
    {
      $set: {
        enabled: { $not: ["$enabled"] },
        toggledAt: "$$NOW",
        toggleCount: { $add: ["$toggleCount", 1] }
      }
    }
  ]
)
```

## Return the New Value After Toggle

Use `findOneAndUpdate` to return the updated document:

```javascript
const result = await db.collection("settings").findOneAndUpdate(
  { _id: settingId },
  [{ $set: { enabled: { $not: ["$enabled"] } } }],
  { returnDocument: "after" }
);

const newState = result.enabled;
console.log(`Feature is now ${newState ? "enabled" : "disabled"}`);
```

## Conditional Toggle (Only Toggle If Currently True)

Sometimes you need to toggle only in one direction:

```javascript
// Only disable (set to false) if currently true
db.users.updateOne(
  {
    _id: userId,
    isActive: true
  },
  { $set: { isActive: false } }
)
```

For the opposite direction, change the filter to `isActive: false`.

## Bulk Toggle for Multiple Documents

Toggle a field across all documents matching a condition:

```javascript
// Toggle isPublished for all draft posts
db.posts.updateMany(
  { status: "draft", authorId: authorId },
  [
    {
      $set: {
        isPublished: { $not: ["$isPublished"] },
        updatedAt: "$$NOW"
      }
    }
  ]
)
```

## Simulating Toggle Without Pipeline Syntax (Older MongoDB)

For MongoDB versions before 4.2, use the `$bit` XOR operator on a numeric 0/1 field:

```javascript
// XOR with 1 flips 0 to 1 and 1 to 0
db.posts.updateOne(
  { _id: postId },
  { $bit: { isPublishedInt: { xor: 1 } } }
)
```

This works only for integer fields. For true boolean fields, the aggregation pipeline approach is required.

## Summary

To atomically toggle a boolean field in MongoDB, use an aggregation pipeline update (MongoDB 4.2+) with `$not` referencing the current field value. This avoids the read-modify-write race condition. For toggling only from true to false or vice versa, use a simple `$set` with the opposite value guarded by a filter condition. Use `findOneAndUpdate` when you need the updated document returned.
