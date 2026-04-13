# How to Append to an Array Only If the Value Does Not Exist in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, Array, Operator, Set

Description: Learn how to add a value to a MongoDB array field only if it isn't already present, using $addToSet to prevent duplicates.

---

A common requirement is adding a value to an array field only if it doesn't already exist - for example, maintaining a list of unique tags, user permissions, or liked post IDs. MongoDB provides `$addToSet` specifically for this use case.

## Using $addToSet

`$addToSet` adds a value to an array only if it is not already present. If the value exists, the operation is a no-op for that element:

```javascript
// Add "mongodb" tag only if it isn't already in the tags array
db.posts.updateOne(
  { _id: postId },
  { $addToSet: { tags: "mongodb" } }
)
```

If `tags` already contains `"mongodb"`, the document is not modified. If not, `"mongodb"` is appended.

## Behavior Comparison: $addToSet vs $push

```javascript
// $push always appends, even if duplicate
db.posts.updateOne({ _id: id }, { $push: { tags: "mongodb" } })
// Result: ["mongodb", "nosql", "mongodb"] - duplicates allowed

// $addToSet never creates duplicates
db.posts.updateOne({ _id: id }, { $addToSet: { tags: "mongodb" } })
// Result: ["mongodb", "nosql"] - unchanged if already present
```

## $addToSet with Embedded Objects

For arrays of objects, `$addToSet` checks for an exact match, including field order:

```javascript
db.users.updateOne(
  { _id: userId },
  {
    $addToSet: {
      permissions: { resource: "invoices", action: "read" }
    }
  }
)
```

The entire object must match exactly - same fields, same values, and same field order - for `$addToSet` to consider it a duplicate. For example, `{ resource: "invoices", action: "read" }` and `{ action: "read", resource: "invoices" }` are treated as different documents. If any field or the ordering differs, a new element is added.

## Adding Multiple Unique Values with $each

Use `$each` modifier with `$addToSet` to add multiple values at once:

```javascript
db.posts.updateOne(
  { _id: postId },
  {
    $addToSet: {
      tags: { $each: ["mongodb", "nosql", "database"] }
    }
  }
)
```

Each value is checked individually - existing values are skipped, new ones are added.

## Creating the Array if It Doesn't Exist

`$addToSet` creates the array field automatically if it doesn't exist:

```javascript
// Works even if "tags" field doesn't exist yet
db.posts.updateOne(
  { _id: postId },
  { $addToSet: { tags: "mongodb" } }
)
// Creates: { tags: ["mongodb"] }
```

## Use Case: Tracking Unique User Actions

```javascript
// Track unique users who liked a post
db.posts.updateOne(
  { _id: postId },
  {
    $addToSet: { likedBy: userId },
    $inc: { likeCount: 1 }   // Note: increment runs regardless
  }
)
```

Note: combining `$addToSet` with `$inc` has a caveat - `$inc` always runs even if `$addToSet` was a no-op. For accurate like counts, use a separate collection or a conditional approach.

## Checking If Element Was Added

```javascript
const result = await db.collection("posts").updateOne(
  { _id: postId },
  { $addToSet: { likedBy: userId } }
);

if (result.modifiedCount === 1) {
  // Successfully added - first time this user liked this post
  await db.collection("posts").updateOne(
    { _id: postId },
    { $inc: { likeCount: 1 } }
  );
} else {
  console.log("User already liked this post");
}
```

## Ensuring Uniqueness at the Index Level

For strong uniqueness guarantees, also consider a separate join collection with a unique index:

```javascript
db.post_likes.createIndex({ postId: 1, userId: 1 }, { unique: true })
```

## Summary

Use `$addToSet` to append a value to an array field only if it does not already exist, preventing duplicates. Use the `$each` modifier to add multiple values at once with the same deduplication behavior. `$addToSet` uses deep equality for object comparisons and automatically creates the array field if absent. For complex uniqueness constraints, back the relationship with a unique index on a join collection.
