# Validation Summary: How to Fix 'cursor killed' Errors in MongoDB

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MongoDB
- MongoDB Node.js driver
- MongoDB cursors
- MongoDB change streams
- MongoDB aggregation
- mongosh administrative commands

## Sources Consulted
- MongoDB Manual: Cursors - https://www.mongodb.com/docs/manual/core/cursors/
- MongoDB Manual: cursor.noCursorTimeout() - https://www.mongodb.com/docs/manual/reference/method/cursor.noCursorTimeout/
- MongoDB Manual: cursor.maxTimeMS() - https://www.mongodb.com/docs/manual/reference/method/cursor.maxTimeMS/
- MongoDB Manual: killCursors command - https://www.mongodb.com/docs/manual/reference/command/killCursors/
- MongoDB Manual: $currentOp aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/
- MongoDB Manual: serverStatus command cursor metrics - https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Node.js Driver: Access Data From a Cursor - https://www.mongodb.com/docs/drivers/node/current/crud/query/cursor/
- MongoDB Node.js Driver API: FindCursor - https://mongodb.github.io/node-mongodb-native/7.0/classes/FindCursor.html
- MongoDB Node.js Driver API: FindOptions - https://mongodb.github.io/node-mongodb-native/7.0/interfaces/FindOptions.html

## Issues Found
- The cursor timeout example said processing took more than 10 minutes total. MongoDB cursor timeout is based on cursor idle time between server requests, so the comment now says the processing takes more than 10 minutes before the next `getMore`.
- The manual cursor termination example used `db.currentOp()` and `db.killOp()` to represent killing cursors. Updated it to use the `killCursors` command for a known cursor and noted `$currentOp` as the current way to inspect cursor details.
- The Node.js driver examples used mongosh-style `.noCursorTimeout()`. Updated them to use the supported Node.js driver `find()` option `{ noCursorTimeout: true }`.
- Added the session idle timeout caveat for long-idle `noCursorTimeout` cursors, because server sessions can still expire and close associated cursors.
- Resumable `_id` queries overwrote an existing `_id` predicate in the caller's query. Updated those examples to combine the original query and resume predicate with `$and`.
- The `maxTimeMS` example used `return` outside a function and could be misleading as an idle-timeout solution. Wrapped it in a function and clarified that `maxTimeMS` bounds processing time, not idle cursor timeout.
- The cursor monitoring example used `db.adminCommand({ currentOp: true })`, which is not the current recommended pattern and does not match the Node.js driver API. Updated it to use `client.db().admin().command({ serverStatus: 1 })` for metrics and `$currentOp` aggregation on the admin database for cursor listing.

## Review Notes
The post is technically relevant and correct after the fixes. Future improvements could mention that `_id`-based resume processing assumes stable ordering and idempotent processing, especially when documents can be inserted, deleted, or updated during the scan.
