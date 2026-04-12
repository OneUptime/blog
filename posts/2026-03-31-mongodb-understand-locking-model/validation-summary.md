# Validation Summary: How to Understand MongoDB's Locking Model

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (locking model, concurrency control)
- WiredTiger storage engine (MVCC, document-level concurrency)
- MongoDB shell commands (`serverStatus`, `currentOp`, `createIndex`)

## Sources Consulted
- MongoDB FAQ: Concurrency - https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB Index Builds on Populated Collections (4.2) - https://www.mongodb.com/docs/v4.2/core/index-creation/
- MongoDB WiredTiger Storage Engine - https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB db.copyDatabase() (4.0 docs) - https://www.mongodb.com/docs/v4.0/reference/method/db.copyDatabase/
- MongoDB currentOp Command - https://www.mongodb.com/docs/manual/reference/command/currentop/
- MongoDB Release Notes for 4.0 and 4.2

## Issues Found
1. **Index build locking version was wrong (4.4 -> 4.2)**: The post stated that before MongoDB 4.4, index builds held a collection write lock for the entire duration, and that since 4.4, hybrid index builds were used. The hybrid index build approach was actually introduced in MongoDB 4.2, not 4.4. Before 4.2, MongoDB offered foreground builds (exclusive collection lock for entire duration) and background builds (less restrictive but slower). Changed all references from 4.4 to 4.2 and clarified the foreground/background distinction.

2. **copyDatabase described as "deprecated" instead of "removed"**: The post called `db.copyDatabase()` "deprecated but illustrative." It was deprecated in MongoDB 4.0 and fully removed in MongoDB 4.2. Updated the comment to say "removed in MongoDB 4.2, shown for illustration."

## Review Notes
- The `currentOp` command used in the post is deprecated since MongoDB 6.2 in favor of the `$currentOp` aggregation stage. This is not incorrect for the versions discussed but may become relevant as readers use newer MongoDB versions.
- The batching example in "Reducing Lock Contention" uses a for loop with `updateMany` but doesn't actually implement batching (no limit or _id range logic). The inline comment acknowledges this, so it serves as a conceptual illustration rather than a working pattern.
- The lock mode labels (R/W/r/w) match MongoDB's own FAQ documentation representations, which differ from standard database theory notation (S/X/IS/IX).
