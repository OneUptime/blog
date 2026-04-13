# Validation Summary: How to Fix MongoError: Killed by Server During Operation in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (server error codes, operation management, cursor handling, transactions)
- MongoDB Node.js Driver (MongoClient options, FindCursor API, retry logic)
- mongosh / mongo shell (killOp, setParameter admin commands)
- systemd / journalctl (log inspection)
- MongoDB Atlas (query profiler, session management)

## Sources Consulted
- MongoDB documentation on error codes: 11600 (InterruptedAtShutdown), 11601 (Interrupted), 50 (ExceededTimeLimit / MaxTimeMSExpired)
- MongoDB Node.js Driver API: `FindCursor` class methods and `FindOptions` interface — `noCursorTimeout` is a `FindOptions` property, not a chainable cursor method
- MongoDB documentation on `db.killOp()` and `db.adminCommand({ killOp: 1, op: <opId> })`
- MongoDB documentation on `retryWrites` and `retryReads` MongoClient options
- MongoDB documentation on `transactionLifetimeLimitSeconds` server parameter (default: 60 seconds)
- MongoDB documentation on cursor timeout behavior (`cursorTimeoutMillis`, default: 10 minutes)
- MongoDB documentation on `setParameter` admin command

## Issues Found
1. **`.noCursorTimeout(true)` is a mongosh method, not a Node.js driver method.** The code example in section "4. Cursor Timeout" used `.find({}).noCursorTimeout(true)` as a chained method call. The `.noCursorTimeout()` method exists on cursors in the mongo shell (mongosh), but the Node.js driver's `FindCursor` class does not expose this method. Since the rest of the post consistently uses Node.js driver syntax (`new MongoClient(...)`, `async/await`, `for await...of`), this was incorrect. Fixed by passing `noCursorTimeout` as a `FindOptions` parameter: `.find({}, { noCursorTimeout: true })`.

## Review Notes
- The `retryWrites: true` and `retryReads: true` options shown in the MongoClient constructor are both already `true` by default in MongoDB Node.js Driver 4.2+ / MongoDB 4.2+. The example is still valid and useful for explicitness, but readers on modern driver versions get this behavior automatically.
- Error code 50 is officially named `ExceededTimeLimit` in MongoDB's error code catalog, but the error message string "MaxTimeMSExpired" does appear in server output. The blog's representation is accurate to what users will see.
- The retry logic correctly handles exponential backoff with a cap at 10 seconds and covers the three main interruption error codes (11600, 11601, 50).
