# Validation Summary: How to Build an Audit Log System with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (document schema, indexes, TTL indexes, change streams)
- Node.js MongoDB driver (`insertOne`, `watch`, `find`, `sort`, `limit`)
- MongoDB Shell (`createIndex`, `runCommand`, `collMod`)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events reference (fullDocument / fullDocumentBeforeChange fields): https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB `collMod` with `changeStreamPreAndPostImages`: https://www.mongodb.com/docs/manual/reference/command/collMod/#change-streams-with-document-pre--and-post-images
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found

1. **Description mentioned "capped collections" but the post never uses them.** The description claimed the post covers "capped collections, change streams, and TTL policies," but capped collections are never discussed or used in the post. Changed to "change streams, TTL indexes, and compound indexes" to accurately reflect the content.

2. **Change stream missing `fullDocument` option.** The `watch()` call only specified `fullDocumentBeforeChange: "required"` but omitted `fullDocument`. Without this option, `change.fullDocument` is `undefined` for `update` events, meaning the `after` state would not be captured in the audit log. Added `fullDocument: "required"` to the watch options.

3. **Missing prerequisite for `fullDocumentBeforeChange: "required"`.** Using `fullDocumentBeforeChange: "required"` requires that the collection has `changeStreamPreAndPostImages` enabled via `collMod` (MongoDB 6.0+). Without this prerequisite, the change stream would throw an error at runtime. Added the `collMod` command with an explanatory note before the change stream code.

## Review Notes
- The post creates both a `{ timestamp: -1 }` regular index and a `{ timestamp: 1 }` TTL index. Since MongoDB can traverse single-field indexes in either direction, the standalone `{ timestamp: -1 }` index is redundant once the TTL index exists. This is a minor optimization concern, not a correctness issue, so it was left as-is.
- The `fullDocument: "required"` option is available starting in MongoDB 6.0. The post does not specify a minimum MongoDB version, but the use of `fullDocumentBeforeChange` already implies 6.0+.
- For `delete` events, `change.fullDocument` will be `null` even with `fullDocument: "required"` since the document no longer exists. The `fullDocumentBeforeChange` field correctly captures the pre-deletion state, which is the important value for audit logging of deletes.
