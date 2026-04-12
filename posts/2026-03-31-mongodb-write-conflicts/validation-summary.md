# Validation Summary: How to Handle Write Conflicts in MongoDB Transactions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, WiredTiger storage engine)
- Node.js with the MongoDB Node.js driver (`mongodb` package)
- Python with PyMongo
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual — Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual — Transactions Production Considerations: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB Manual — FAQ Concurrency: https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB Manual — serverStatus: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Manual — maxTransactionLockRequestTimeoutMillis: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.maxTransactionLockRequestTimeoutMillis
- MongoDB Node.js Driver — Transactions: https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- PyMongo Documentation — Transactions: https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html

## Issues Found

### Issue 1: Incorrect description of write conflict detection mechanism
**What was wrong:** The post stated MongoDB uses "optimistic concurrency control" where "both transactions can proceed until commit time, at which point MongoDB detects the conflict." This is incorrect — MongoDB uses document-level locking via WiredTiger. When a transaction writes to a document, it acquires a lock. A second transaction's write operation to the same document blocks and then fails with WriteConflict after `maxTransactionLockRequestTimeoutMillis` (default 5ms). The conflict is detected at **write time**, not at commit time.
**What was changed:** Rewrote the opening paragraph to accurately describe the document-level locking mechanism and mention the `maxTransactionLockRequestTimeoutMillis` parameter.

### Issue 2: Incorrect sequence diagram
**What was wrong:** The diagram showed both Transaction A and Transaction B successfully executing their `updateOne` operations, with the WriteConflict only occurring when Transaction B tried to `commitTransaction`. In reality, Transaction B's `updateOne` is where the conflict is detected (the write blocks and fails because Transaction A holds the lock).
**What was changed:** Updated the diagram to show Transaction A's write succeeding with lock acquisition, Transaction B's write failing with WriteConflict, and Transaction A committing successfully afterward.

### Issue 3: Incorrect "When Write Conflicts Happen" description
**What was wrong:** The numbered steps described the conflict as being detected "when Transaction A tries to commit." This is misleading — conflicts are detected at write time. The description also conflated two different scenarios into one unclear sequence.
**What was changed:** Replaced with two clearly separated scenarios: (1) concurrent lock contention where the second writer fails, and (2) stale snapshot where a transaction tries to write a document that was modified by another committed transaction since its snapshot.

### Issue 4: Incorrect reproduction example
**What was wrong:** The example showed Session 2's `commitTransaction()` succeeding and Session 1's `commitTransaction()` throwing WriteConflict. In reality, Session 1 writes first and acquires the lock on `product1`. Session 2's `updateOne` call would then block and throw WriteConflict because Session 1 holds the lock — Session 2 would never reach `commitTransaction()`. Also removed the redundant `{ session: s1 }` option since `s1.getDatabase()` already binds operations to the session in mongosh.
**What was changed:** Fixed the example to show the WriteConflict occurring at Session 2's `updateOne` call, and Session 1's `commitTransaction()` succeeding.

## Review Notes
- The Python code uses `return_document=True` instead of the more idiomatic `return_document=pymongo.ReturnDocument.AFTER`. This works correctly since `ReturnDocument.AFTER` equals `True`, but the named constant is clearer.
- The Python code uses `__import__("datetime").datetime.utcnow()` which is functional but unconventional. Also, `datetime.utcnow()` is deprecated in Python 3.12+ in favor of `datetime.now(datetime.UTC)`.
- The Python error detection uses string matching (`"WriteConflict" in str(e)`) rather than the more robust `e.has_error_label("TransientTransactionError")` method available on PyMongo errors.
- The manual retry pattern's exponential backoff starts at 100ms (2^1 * 50) after the first failure, not 50ms as stated in the Best Practices section ("50ms, 100ms, 200ms"). The actual delays are 100ms and 200ms for retries 1 and 2.
- The `throw new Error(...)` after the while loop in the manual retry pattern is dead code — every loop iteration either returns on success or throws on error.
- `.count()` in the profiler query is deprecated in modern MongoDB; `.countDocuments()` is preferred.
