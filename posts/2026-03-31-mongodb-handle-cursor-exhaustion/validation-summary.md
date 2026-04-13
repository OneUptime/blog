# Validation Summary: How to Handle Cursor Exhaustion in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server-side cursor behavior, error codes)
- Node.js MongoDB driver (`mongodb` npm package, v5/v6)
- PyMongo (Python MongoDB driver)
- JavaScript (async iteration with `for await...of`)
- Python

## Sources Consulted
- MongoDB Node.js driver source code and API docs: https://github.com/mongodb/node-mongodb-native
- MongoDB Node.js driver `FindOptions` interface (`src/operations/find.ts`) for `noCursorTimeout` option
- MongoDB Node.js driver `AbstractCursor` class (`src/cursor/abstract_cursor.ts`) for `closed` getter property
- MongoDB Node.js driver error class hierarchy (`etc/notes/errors.md`) for `MongoCursorExhaustedError` vs server errors
- MongoDB server error codes reference: https://www.mongodb.com/docs/manual/reference/error-codes/ (error code 43 = CursorNotFound)
- MongoDB server `cursorTimeoutMillis` parameter documentation (default 600,000 ms / 10 minutes)
- PyMongo source code (`pymongo/errors.py`): https://github.com/mongodb/mongo-python-driver for `CursorNotFound` class

## Issues Found

1. **Unused and misleading import of `MongoCursorExhaustedError`** (line 41): The Node.js code example imported `MongoCursorExhaustedError` from the `mongodb` package, but this class was never used in the error handling logic. More importantly, `MongoCursorExhaustedError` is a client-side error thrown when trying to iterate an already-exhausted cursor — it is not related to the server-side `CursorNotFound` (error code 43) that the code actually handles. Removed the unused import to avoid confusion.

2. **Incorrect section header `cursor.isClosed()`** (line 103): The section title referenced `cursor.isClosed()` as if it were a public method, but the Node.js driver exposes a `closed` boolean getter property, not an `isClosed()` method. The code in the section correctly used `cursor.closed`. Fixed the heading to match the actual API: `cursor.closed`.

## Review Notes
- The checkpoint-based pagination pattern (resuming from `lastProcessedId` / `last_id`) is correctly implemented in both the Node.js and Python examples and is the recommended approach for resilient cursor consumption.
- The `noCursorTimeout` option is correctly documented, including the important note about pairing it with explicit `cursor.close()` in a `finally` block. Worth noting that even with `noCursorTimeout`, sessions have a 30-minute idle timeout that can still kill cursors — but this is an advanced detail beyond the scope of this post.
- The first code example (Normal Cursor Exhaustion) uses mongosh-style synchronous `hasNext()`/`next()` syntax, while subsequent examples use the Node.js driver's async API. This is a minor style inconsistency but is not technically incorrect since the first example serves as a conceptual illustration.
