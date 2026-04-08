# How to Build a Comment System with Nested Replies in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema, Embedding, Aggregation, Tree

Description: Learn how to model a comment system with nested replies in MongoDB using hybrid embedding, parent references, and aggregation for thread reconstruction.

---

Nested comment systems are deceptively complex to model. MongoDB offers several strategies depending on expected depth, reply volume, and query patterns. A hybrid approach - embedding shallow replies directly and using parent references for deeper nesting - balances performance and flexibility.

## Flat Model with Parent References

For deeply nested threads, store each comment as a separate document with a `parentId` reference.

```javascript
db.comments.insertMany([
  {
    _id: ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"),
    postId: "post-42",
    parentId: null,
    author: "alice",
    body: "Great article!",
    likes: 12,
    createdAt: new Date()
  },
  {
    _id: ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb"),
    postId: "post-42",
    parentId: ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"),
    author: "bob",
    body: "Agreed, especially the third section.",
    likes: 3,
    createdAt: new Date()
  }
]);
```

## Indexing for Thread Retrieval

Create indexes that support fetching all comments for a post and all replies to a specific comment.

```javascript
db.comments.createIndex({ postId: 1, createdAt: 1 });
db.comments.createIndex({ parentId: 1, createdAt: 1 });
```

## Fetching Top-Level Comments

Get all root-level comments for a post, sorted by creation time.

```javascript
db.comments.find(
  { postId: "post-42", parentId: null },
  { author: 1, body: 1, likes: 1, createdAt: 1 }
).sort({ createdAt: 1 });
```

## Fetching Replies for a Comment

Retrieve all direct replies to a given comment.

```javascript
db.comments.find(
  { parentId: ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa") }
).sort({ createdAt: 1 });
```

## Reconstructing the Full Thread with $graphLookup

Use `$graphLookup` to recursively retrieve an entire comment tree from a single aggregation.

```javascript
db.comments.aggregate([
  { $match: { postId: "post-42", parentId: null } },
  {
    $graphLookup: {
      from: "comments",
      startWith: "$_id",
      connectFromField: "_id",
      connectToField: "parentId",
      as: "replies",
      maxDepth: 5,
      depthField: "depth"
    }
  }
]);
```

`$graphLookup` follows the `parentId` reference recursively up to `maxDepth` levels, returning all descendant comments in the `replies` array. The `depthField` option records how deep each reply sits in the tree.

## Embedding Shallow Replies

For comment systems where replies rarely exceed one level, embed replies directly in the parent document to reduce round trips.

```javascript
db.comments.updateOne(
  { _id: ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa") },
  {
    $push: {
      replies: {
        replyId: ObjectId(),
        author: "carol",
        body: "Thanks for the clarification.",
        createdAt: new Date()
      }
    }
  }
);
```

Keep the embedded array small (fewer than 100 replies) to avoid document size limits and degrading update performance.

## Summary

A MongoDB comment system works best with a parent-reference model for deeply nested threads and embedded replies for shallow, bounded conversations. Index on `postId` and `parentId` for efficient fetching. Use `$graphLookup` when you need to reconstruct entire threads in a single query, limiting `maxDepth` to control recursion and keep response times predictable.
