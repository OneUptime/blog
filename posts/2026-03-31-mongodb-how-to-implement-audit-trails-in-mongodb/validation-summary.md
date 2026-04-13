# Validation Summary: How to Implement Audit Trails in MongoDB

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- MongoDB (document database)
- MongoDB Node.js Driver (v5+/v6+ API: `findOneAndUpdate`, `insertOne`, `createIndex`)
- JavaScript (ES6+ classes, async/await, destructuring)

## Sources Consulted
- MongoDB Node.js Driver documentation for `findOneAndUpdate` — `returnDocument: "after"` option and return type behavior (returns document directly in v5+)
- MongoDB documentation on update operators (`$set`, `$inc`, `$push`) — confirming that aggregation expressions like `$add` are not supported inside `$push`
- MongoDB documentation on aggregation pipeline updates — confirming that pipeline-style updates use array syntax and different operators (`$concatArrays` instead of `$push`)
- MongoDB documentation on TTL indexes — confirming `expireAfterSeconds` on date fields
- MongoDB documentation on ObjectId — 24-character hex string requirement
- MongoDB documentation on multi-document transactions — for atomicity across collections

## Issues Found

1. **Invalid aggregation expression inside `$push` (Critical)**: Pattern 2's `updateWithInlineHistory` function used `{ $add: ["$__v", 1] }` inside a `$push` operator. Aggregation expressions like `$add` do not work inside regular update operators — the expression would be stored as a literal object in the document rather than being computed. Fixed by reading the current document first to compute the version number, then using optimistic concurrency control (`__v` check in the filter) consistent with Pattern 1's approach.

2. **Incorrect terminology in overview (Moderate)**: The overview described Pattern 2 as an "event sourcing approach". Event sourcing stores domain events and reconstructs state by replaying them. Pattern 2 is an inline history array that stores change snapshots within the document — a fundamentally different pattern. Fixed by changing to "inline history array approach".

3. **False atomicity claim in summary (Moderate)**: The summary stated that the shadow collection writes happen "atomically". In reality, the main document update and the history collection insert are two separate operations with no transaction wrapping them. If the history insert fails after a successful main update, the audit trail would be incomplete. Fixed by removing the atomicity claim and adding a note that multi-document transactions should be used for strict atomicity.

4. **Invalid ObjectId in schema example (Minor)**: `ObjectId("abc")` is not a valid MongoDB ObjectId — it requires a 24-character hexadecimal string (representing 12 bytes). Fixed by replacing with `ObjectId("64a1b2c3d4e5f6a7b8c9d0e1")`.

## Review Notes
- The shadow collection pattern (Pattern 1) performs a `findOne` followed by `findOneAndUpdate` and then `insertOne` — three separate database operations without a transaction. In a high-concurrency environment, consider wrapping these in a multi-document transaction (available in MongoDB 4.0+ for replica sets, 4.2+ for sharded clusters) to guarantee consistency between the main and history collections.
- The `changedAt: -1` index and the TTL index on `changedAt: 1` are two separate indexes on the same field with different sort orders. MongoDB can traverse an index in either direction, so the standalone `changedAt: -1` index is redundant when the TTL index on `changedAt: 1` exists. This is not incorrect but wastes storage and write overhead.
- The `updateWithHistory` method spreads the `update` parameter and then overrides `$inc` and `$set`. If a caller passes an update with its own `$inc` fields, those would be silently dropped. This is an acceptable simplification for a blog post but worth noting for production use.
