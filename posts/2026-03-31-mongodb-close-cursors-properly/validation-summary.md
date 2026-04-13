# Validation Summary: How to Close Cursors Properly in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server-side cursor management, `serverStatus` command)
- Node.js MongoDB driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- Java MongoDB driver (`mongo-java-driver`)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Limits and Thresholds documentation — https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB `serverStatus` command reference — https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- PyMongo Cursor API documentation — https://pymongo.readthedocs.io/en/stable/api/pymongo/cursor.html
- Node.js MongoDB Driver Cursor documentation — https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/cursor/
- Node.js MongoDB Driver source (`abstract_cursor.ts`) for `for await...of` auto-close behavior
- MongoDB Community Forums for cursor error messages

## Issues Found
1. **Inaccurate cursor limit claim (fixed):** The post stated "MongoDB allows up to 16,384 open cursors per connection by default." This number is not documented in official MongoDB documentation. There is no documented default per-connection cursor limit of 16,384. Removed the specific number and reworded to accurately describe the resource exhaustion risk.

2. **Non-existent error name (fixed):** The post referenced a `TooManyCursors` error. This is not a real MongoDB error name or code. The actual error message is `"cannot open a new cursor since too many cursors are already opened"`. Replaced with the real error message.

## Review Notes
- The `serverStatus` metrics comment (`open.total`, `timedOut`, `totalOpened`) is correct — `totalOpened` is a cumulative counter of cursors opened since server start.
- The PyMongo context manager example (`with collection.find() as cursor:`) is correct for modern PyMongo (4.x+).
- The Node.js `for await...of` auto-close behavior is correctly described — the driver's async iterator calls `close()` in a `finally` block. The explicit `cursor.close()` in the `finally` block is a safe belt-and-suspenders approach since closing an already-closed cursor is idempotent.
- The Java `try-with-resources` example is correct — `MongoCursor` implements `AutoCloseable`.
- The default cursor idle timeout of 10 minutes is correct (configurable via `cursorTimeoutMillis` server parameter).
