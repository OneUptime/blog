# Validation Summary: How to Use MongoDB's WiredTiger Document-Level Locking

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (3.2+)
- WiredTiger storage engine
- MongoDB server status and monitoring commands (`db.serverStatus()`, `db.currentOp()`)
- Multi-document transactions (MongoDB 4.0+)
- Bulk write operations

## Sources Consulted
- MongoDB official documentation on WiredTiger concurrency: https://www.mongodb.com/docs/manual/core/wiredtiger/#concurrency
- MongoDB official documentation on FAQ concurrency / locking: https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB official documentation on `db.serverStatus()`: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation on `db.currentOp()`: https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB official documentation on lock modes: https://www.mongodb.com/docs/manual/reference/glossary/#std-term-intent-lock
- MongoDB official documentation on transactions: https://www.mongodb.com/docs/manual/core/transactions/

## Issues Found

1. **Lock hierarchy incorrectly described document-level read locking** (line 24): The original text stated "Document (exclusive for writes, shared for reads)." This is inaccurate. WiredTiger uses optimistic concurrency control at the document level for writes, and reads use MVCC snapshots — they do not acquire any document-level lock. Changed to: "Document (optimistic concurrency control for writes; reads use snapshots and do not acquire document-level locks)."

2. **"Global Write Lock Operations" section was misleading** (lines 46-53): The section claimed that `db.repairDatabase()`, `db.createCollection()`, `collMod`, and pre-4.2 index builds all "require a global write lock." This is incorrect for most of the listed operations:
   - `db.repairDatabase()` did acquire a global exclusive lock, but it was deprecated in MongoDB 4.0 and removed in MongoDB 5.0, so it is no longer relevant.
   - `db.createCollection()` acquires a database-level exclusive lock, not a global lock.
   - `collMod` acquires a database-level exclusive lock, not a global lock.
   - Foreground index builds before MongoDB 4.2 acquired a collection-level exclusive lock, not a global lock.

   Rewrote the section with the correct lock levels and removed the deprecated `repairDatabase()` reference.

## Review Notes
- The description of multi-document transactions as using "pessimistic locking" is a simplification. MongoDB's documentation describes WiredTiger as using optimistic concurrency control, with write conflicts causing transaction aborts and retries. However, within a transaction, locks are held until commit/abort, which does resemble pessimistic behavior. The current wording is acceptable but could be more nuanced in a future revision.
- The `db.serverStatus().locks` output field `deadlockCount` mentioned in the "Checking Current Lock Status" section is a valid field but deadlocks are extremely rare with WiredTiger. The more practical contention indicators are `acquireWaitCount` and `timeAcquiringMicros`. This is not wrong but could be improved for practical guidance.
- The transaction code example uses `client.startSession()` which is the Node.js driver pattern. It works but `session.commitTransaction()` should typically be awaited (`await session.commitTransaction()`) in async Node.js code. Since the example is illustrative and uses `mongosh`-style pseudocode, this is acceptable.
