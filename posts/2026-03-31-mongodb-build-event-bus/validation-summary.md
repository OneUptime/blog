# Validation Summary: How to Build an Event Bus with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (change streams, collections, indexes)
- Node.js MongoDB Driver (`collection.watch()`, `insertOne`, change stream event API)
- JavaScript (ES6 classes, `Promise.allSettled`, `Map`, async/await)
- Pub/Sub messaging pattern

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js Driver Change Stream API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/
- MongoDB `createCollection` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Sparse Indexes documentation: https://www.mongodb.com/docs/manual/core/index-sparse/
- MDN `Promise.allSettled`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled

## Issues Found
No technical issues found.

## Review Notes
- The `fullDocument: "updateLookup"` option in the `start()` method has no effect since the pipeline only matches `operationType: "insert"`. Insert change events always include the full document regardless of this setting. This option is designed to re-fetch the current document after update operations. It does not cause errors, but could be misleading to readers. If the pipeline were later expanded to include updates, the option would become useful.
- The sparse index on `{ processedBy: 1, publishedAt: 1 }` provides no benefit because `publish()` always initializes `processedBy` as an empty array. Sparse indexes only omit documents where the indexed field does not exist. Since the field is always present, the sparse index behaves identically to a regular index.
- Both observations above are minor and do not affect the correctness or functionality of the code.
