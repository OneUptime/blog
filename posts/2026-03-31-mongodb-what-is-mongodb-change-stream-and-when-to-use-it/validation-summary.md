# Validation Summary: What Is MongoDB Change Stream and When to Use It

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Change Streams
- MongoDB oplog
- MongoDB Node.js Driver
- Elasticsearch (in sync example)

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Change Events reference: https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Node.js Driver Change Stream API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/

## Issues Found

1. **Elasticsearch sync example missing `fullDocument: "updateLookup"`**: The `watch()` call on the articles collection did not include the `fullDocument: "updateLookup"` option, but the handler accessed `change.fullDocument` for update events. Without this option, `fullDocument` is `undefined` for update change events (it is only automatically included for insert events). Fixed by adding `{ fullDocument: "updateLookup" }` to the `watch()` call.

2. **Notification trigger example missing `fullDocument: "updateLookup"`**: The notification watcher matched on `updateDescription.updatedFields.status`, meaning it only fires on update events, then accessed `change.fullDocument.userId`. Without `fullDocument: "updateLookup"`, this would throw a runtime error because `fullDocument` is `undefined` on update events by default. Fixed by adding `{ fullDocument: "updateLookup" }` to the `watch()` call.

## Review Notes
- The resume token example initializes `resumeToken` to `null` and passes `resumeAfter: null` on first run. In practice, the MongoDB driver handles this gracefully (it ignores a null resume token), but production code should conditionally include the option. This is a best-practice concern, not a correctness issue.
- The version requirements listed (3.6+ for collections, 4.0+ for databases and deployments) are accurate. MongoDB 6.0+ also introduced `fullDocumentBeforeChange` for pre-image support, which is not mentioned but is not required for this introductory post.
- All change event structures shown (insert, update, delete) accurately represent the MongoDB change event format.
