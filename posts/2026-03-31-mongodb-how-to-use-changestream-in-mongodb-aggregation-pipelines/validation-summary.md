# Validation Summary: How to Use $changeStream in MongoDB Aggregation Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB Aggregation Pipelines
- Node.js MongoDB Driver
- Real-time event processing

## Sources Consulted
- MongoDB official documentation: Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB official documentation: Change Events — https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB official documentation: `db.collection.watch()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB official documentation: `db.watch()` — https://www.mongodb.com/docs/manual/reference/method/db.watch/
- MongoDB official documentation: `Mongo.watch()` — https://www.mongodb.com/docs/manual/reference/method/Mongo.watch/
- MongoDB Node.js Driver documentation: Change Streams — https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/

## Issues Found

1. **Broken code example in "Watching Specific Field Changes" section**: The code filtered on `"fullDocument.status"` with `operationType: "update"` but did not pass the `fullDocument: "updateLookup"` option. For update events, `fullDocument` is not included by default, so the `$match` would never match any events. Fixed by adding `{ fullDocument: "updateLookup" }` as the second argument to `watch()`.

2. **Misleading note about fullDocument availability**: The note stated that `fullDocument` is "only included when you enable `fullDocument: 'updateLookup'`", which is incorrect — `fullDocument` is always present for insert and replace events. The caveat applies specifically to update events. Fixed the note to clarify this applies to update events specifically.

3. **Incomplete pipeline restrictions list**: The list of supported aggregation stages in change stream pipelines was missing `$redact`, which is a supported stage per MongoDB documentation. Added `$redact` to the list.

## Review Notes
- MongoDB 6.0+ introduced additional `fullDocument` options beyond `"updateLookup"`: `"whenAvailable"` and `"required"`, as well as `fullDocumentBeforeChange`. The post only covers `"updateLookup"` which is fine for an introductory tutorial, but readers on MongoDB 6.0+ may benefit from knowing about these newer options.
- The resume token example initializes `resumeToken` as `null` and passes it in the initial `watch()` call via `resumeAfter: null`. While MongoDB drivers typically handle this gracefully, a production implementation should conditionally include the `resumeAfter` option only when a token is available.
- The "Real-Time Notifications" example passes `fullDocument: "updateLookup"` for an insert-only stream. This is harmless but unnecessary since `fullDocument` is always included for insert events.
