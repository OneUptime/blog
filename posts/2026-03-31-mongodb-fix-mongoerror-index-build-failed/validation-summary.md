# Validation Summary: How to Fix MongoError: Index Build Failed in MongoDB

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (server and index management)
- MongoDB Node.js Driver (`createIndex`, `aggregate`, `deleteMany`, `indexes`, `dropIndex`)
- mongosh (shell commands: `currentOp`, `adminCommand`)
- Linux CLI (`df`)

## Sources Consulted
- MongoDB Manual: Index Builds on Populated Collections — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: `dropIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.dropIndex/
- MongoDB Manual: `currentOp` — https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB Manual: `killOp` — https://www.mongodb.com/docs/manual/reference/command/killOp/
- MongoDB Manual: Unique Indexes — https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Sparse Indexes — https://www.mongodb.com/docs/manual/core/index-sparse/

## Issues Found

1. **Incorrect claim about index build behavior on restart (Cause 3):** The post stated that "the partially-built index is cleaned up on startup," which is incorrect for MongoDB 4.4+. Since MongoDB 4.4, in-progress index builds are automatically resumed on restart. Updated the text to distinguish between 4.4+ (auto-resume) and older versions (index discarded, must rebuild manually).

2. **Outdated advice for aborting index builds (Aborting a Stuck Index Build section):** The post only showed `killOp` to abort an index build. MongoDB 4.4+ documentation explicitly discourages using `killOp` for this purpose (especially on secondaries) and recommends using `dropIndex()` on the in-progress index instead. Added the modern `dropIndex()` approach as the primary method and kept `killOp` as a fallback for older versions.

3. **Missing `await` on `indexes()` call (Monitoring section):** `db.collection('orders').indexes()` was missing `await`, inconsistent with the Node.js driver async pattern used throughout the rest of the post. Added `await`.

## Review Notes
- The post mixes mongosh shell syntax (`db.currentOp(...)`, `db.adminCommand(...)`) with Node.js driver syntax (`await db.collection(...).createIndex(...)`) across different code blocks. This is acceptable since different sections demonstrate different contexts, but readers could benefit from explicit labels indicating which environment each snippet targets.
- The Cause 4 (Schema Constraint Violation) section is somewhat misleading — sparse and partial indexes are presented as potential causes of index build failure, but they are actually solutions to avoid constraint violations (e.g., duplicate key errors on fields with many null values). The section is not technically wrong, but the framing could be clearer in a future revision.
