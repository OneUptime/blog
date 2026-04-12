# Validation Summary: How to Use Write Concern w:0 (Fire-and-Forget) in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (write concern configuration)
- MongoDB Node.js Driver (`mongodb` npm package)
- MongoDB Shell (`mongosh`)
- MongoDB connection string URI options

## Sources Consulted
- MongoDB documentation on Write Concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Node.js Driver API documentation for `WriteConcern`: https://mongodb.github.io/node-mongodb-native/
- MongoDB documentation on `insertOne` and `insertMany` result objects
- MongoDB connection string URI format documentation: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found

### 1. Incorrect claim about `insertedId` availability with w:0
- **What was wrong:** The text stated "The result does not contain `insertedId`, `matchedCount`, or other operation-specific fields" — this is inaccurate for `insertedId`. With `w:0`, `insertedId` IS returned because `ObjectId` values are generated client-side before the write is sent to the server. Server-computed fields like `matchedCount` and `modifiedCount` are indeed unavailable.
- **What was changed:** Rewrote the explanation to clarify that `acknowledged` is `false` and server-computed fields are unavailable, but `insertedId` is still returned. Changed the code comment from "may be" to "is" a client-generated ObjectId.
- **Why:** The original text contradicted its own code comment and was inaccurate per the MongoDB Node.js driver behavior.

### 2. Race condition in fire-and-forget example
- **What was wrong:** The `insertMany` call was not awaited, and `client.close()` was called immediately after. The comment said "we don't await - this truly fires and forgets." Even with `w:0`, the driver must still serialize and send the data to the network socket. Closing the client before `insertMany` completes its send can cause the write to be lost entirely — not because the server didn't acknowledge, but because the data never reached the server.
- **What was changed:** Added `await` to the `insertMany` call and updated the comments to explain that with `w:0`, `await` returns as soon as the data is sent to the socket, without waiting for server acknowledgment.
- **Why:** The original code demonstrated a race condition that would silently lose data for a reason unrelated to write concern — a misleading example for readers trying to learn about `w:0`.

## Review Notes
- The throughput comparison table gives approximate figures (10x, 0.3x baseline) which are reasonable ballpark numbers. The disclaimer about hardware/network/document-size dependence is appropriate.
- The hybrid strategy (every 100th write uses `w:1`) is a sound pattern and correctly implemented.
- The error handling section accurately describes that `try/catch` with `w:0` only catches driver-level connection errors, not write failures.
- All connection string formats, driver API usage (`WriteConcern` class, operation-level options), and mongosh examples are syntactically correct and use current APIs.
