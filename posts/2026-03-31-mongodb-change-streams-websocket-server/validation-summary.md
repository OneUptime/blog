# Validation Summary: How to Use MongoDB Change Streams with WebSocket Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB Node.js Driver (`mongodb` npm package)
- WebSocket (`ws` npm package)
- Node.js
- `wscat` CLI tool

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver API — `Collection.watch()`: https://mongodb.github.io/node-mongodb-native/
- `ws` npm package API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- MongoDB `fullDocument` option for change streams: https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB resume token and `resumeAfter` option: https://www.mongodb.com/docs/manual/changeStreams/#resume-a-change-stream

## Issues Found
No technical issues found.

## Review Notes
- The `ws.readyState === ws.OPEN` pattern works correctly because the `ws` library exposes readyState constants (`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`) on both the class and the prototype, so instance-level access is valid.
- The retry loop in `watchWithRetry` correctly stores and reuses the resume token via `resumeAfter`. The `event._id` field is the correct resume token per MongoDB documentation.
- Change streams require a replica set or sharded cluster deployment. The post implicitly assumes this when mentioning "if the replica set has issues" but does not explicitly state this prerequisite. This is a minor omission but not a technical error.
- The `fullDocument: 'updateLookup'` option is correctly used to retrieve the full document for update operations. Without this option, update events only contain the delta.
