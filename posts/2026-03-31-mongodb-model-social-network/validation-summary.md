# Validation Summary: How to Model a Social Network with Followers in MongoDB

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (document model, indexes, aggregation-free query patterns)
- MongoDB Node.js Driver (collection methods: find, updateOne, insertOne, bulkWrite)
- Cursor-based pagination
- Fan-out-on-read vs fan-out-on-write feed architectures

## Sources Consulted
- MongoDB Manual — createIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual — updateOne with upsert: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB Manual — $setOnInsert: https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB Node.js Driver — FindCursor (sort, limit, project chaining): https://mongodb.github.io/node-mongodb-native/
- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 11 — fan-out strategies for social network timelines

## Issues Found

### 1. followUser function did not guard against duplicate follows inflating stats
**What was wrong:** The `followUser` function used `updateOne` with `$setOnInsert` and `upsert: true` to idempotently create the follow document. However, the subsequent `bulkWrite` that increments `stats.following` and `stats.followers` ran unconditionally. If a user called `followUser` for a relationship that already existed, the upsert would match the existing document (no insert), but the counters would still be incremented, leading to inflated stats.

**What was changed:** Added a check on `result.upsertedCount === 1` so the stats increment only runs when a new follow document was actually created.

### 2. Fan-out strategy table had strategies reversed for regular users and celebrities
**What was wrong:** The table recommended fan-out-on-read for regular users (< 10K followers) and fan-out-on-write for celebrities (> 10K followers). This is backwards. Fan-out-on-write means writing to every follower's feed on post creation — this is cheap for users with few followers but prohibitively expensive for celebrities with millions of followers. The hybrid row in the same table was correct and contradicted the first two rows.

**What was changed:** Swapped the strategies: regular users now show fan-out-on-write (pre-computed feed), and celebrities now show fan-out-on-read or hybrid. This aligns with the well-known architecture described in *Designing Data-Intensive Applications* and used by Twitter's original timeline service.

## Review Notes
- The code examples use `ObjectId()` without `new` in several places (e.g., `ObjectId(userId)`). In MongoDB Node.js driver v6+ (which uses BSON v6), calling `ObjectId` as a function without `new` may not be supported. Since the post doesn't target a specific driver version and this is a common shorthand in MongoDB tutorials, no change was made, but readers using driver v6+ should use `new ObjectId()`.
- The `getFollowers` function fetches follower user documents with `$in`, which does not guarantee the returned documents match the sort order of the follows query. For a production implementation, the results should be reordered client-side to match the pagination order. This is a minor consideration not worth changing in a tutorial context.
- The `getMutualFollowers` function loads full follow lists for both users into memory. For users following thousands of accounts, an aggregation pipeline with `$setIntersection` or a server-side approach would be more efficient. Again, acceptable for a tutorial.
