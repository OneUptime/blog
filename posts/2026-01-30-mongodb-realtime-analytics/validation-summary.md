# Validation Summary: How to Build MongoDB Real-Time Analytics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MongoDB change streams
- MongoDB time-series collections
- MongoDB aggregation pipelines and `$dateTrunc`
- MongoDB Node.js driver
- Node.js
- WebSocket server with `ws`
- React dashboard component

## Sources Consulted
- MongoDB Manual: Change Streams - https://www.mongodb.com/docs/manual/changestreams/
- MongoDB Manual: `db.collection.watch()` - https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB Node.js Driver: `ChangeStreamOptions` - https://mongodb.github.io/node-mongodb-native/6.2/interfaces/ChangeStreamOptions.html
- MongoDB Manual: Time Series Collections - https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: Time Series Indexes - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-index/
- MongoDB Manual: Time Series Collection Limitations - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
- MongoDB Manual: `$dateTrunc` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/datetrunc/
- MongoDB Node.js Driver: `MongoClientOptions` - https://mongodb.github.io/node-mongodb-native/7.0/interfaces/MongoClientOptions.html

## Issues Found
- The resilient change stream helper passed the custom `tokenFile` option through to `collection.watch()`. I removed `tokenFile` from the watch options before opening the stream.
- The resilient change stream helper restarted after an error without closing the current stream. I added a close call before scheduling the restart.
- The filtered change stream example matched `fullDocument.eventType`, but the article's event schema stores the type under `fullDocument.metadata.eventType`. I updated the match and projection paths.
- The filtered change stream projection included conflicting parent and child metadata paths after correction. I kept the parent metadata projection to avoid MongoDB path collision.
- The batch insert comment said `ordered: false` continues on duplicate key errors specifically. I generalized it to individual write errors, which matches MongoDB bulk-write behavior more accurately.
- The tumbling-window p95 example selected from unsorted values. I added a sort before grouping and changed the index calculation to a nearest-rank style expression.
- The WebSocket server watched `metrics_preagg` without `fullDocument: 'updateLookup'`, so update change events would not include the updated document used by the handler. I added the option to the watch call.
- The React component initialized `metrics` as an array while treating it as an object keyed by channel. I changed the initial state to `{}`.
- The batch processor serialized metric keys with colon-separated values, but ISO timestamps contain colons, so parsing with `split(':')` produced the wrong bucket. I changed the key to a JSON-encoded tuple and parsed it with `JSON.parse`.
- The batch processor re-queued failed event inserts but dropped failed metric updates. I added logic to merge failed metric updates back into the pending map.
- The complete example passed a database object to `RealTimeDashboardServer`, whose constructor expects a MongoDB URI. I changed it to pass `this.mongoUri`.
- The complete example called a non-existent `broadcastEvent()` method. I changed it to use the existing `broadcast()` method with the correct event channel and payload.
- The summary described change streams as providing "guaranteed delivery." I changed this to "resumable delivery" because MongoDB resume tokens depend on the relevant oplog history still being available.

## Review Notes
The examples are technically consistent with current MongoDB and Node.js driver behavior after the fixes. Some snippets remain illustrative and omit surrounding application setup, error handling, authentication, and production deployment details, which is acceptable for this style of guide.
