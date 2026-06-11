# Validation Summary: How to Build MongoDB Computed Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB data modeling and the computed schema pattern
- MongoDB aggregation pipeline
- MongoDB change streams and pre-images
- MongoDB multi-document transactions
- MongoDB indexes and partial indexes
- Node.js with the official `mongodb` driver
- node-cron scheduled jobs
- JavaScript / BSON examples

## Sources Consulted
- MongoDB Manual: Store Computed Data — https://www.mongodb.com/docs/manual/data-modeling/design-patterns/computed-values/computed-schema-pattern/
- MongoDB Blog: Building with Patterns: The Computed Pattern — https://www.mongodb.com/company/blog/building-with-patterns-the-computed-pattern
- MongoDB Node.js Driver: Transactions — https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- MongoDB Manual: Change Streams — https://www.mongodb.com/docs/manual/changestreams/
- MongoDB Manual: db.collection.watch() — https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB Manual: `$addToSet` accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/addtoset/
- MongoDB Manual: `$unwind` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- MongoDB Manual: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/

## Issues Found
- The `removeItemFromOrder` example dereferenced `order.items` without checking whether the order document existed. Added an `Order not found` guard before accessing `items`.
- The change stream examples read `fullDocumentBeforeChange` for delete events but did not request pre-images in `watch()`. Added `{ fullDocumentBeforeChange: 'whenAvailable' }` to the relevant `watch()` calls and clarified that collection pre-images must be enabled or the application must store the needed identifier before deletion.
- The customer statistics aggregation used `$addToSet: '$items.productId'`, which adds each order's product ID array as a single set element rather than flattening unique products. Changed the aggregation to collect arrays with `$push` and flatten/deduplicate them with `$reduce` and `$setUnion` before counting.
- Several transaction examples attempted to call `startSession()` through a collection-like `client` property. Updated those classes to accept a `MongoClient` instance and call `this.client.startSession()`, matching the official Node.js driver transaction examples.
- The product schema example was a bare object literal in a JavaScript code fence, which is not valid as a standalone JavaScript block. Changed it to `const product = { ... };`.

## Review Notes
- Change streams require a replica set or sharded cluster deployment, and `fullDocumentBeforeChange` requires MongoDB 6.0+ with pre- and post-images enabled on the collection. The examples now request pre-images, but production code should also include resume-token handling and durable retry behavior.
- The examples use modern MongoDB features such as `$dateDiff`, `$round`, `$setUnion`, change stream pre-images, and multi-document transactions. These are valid for current MongoDB versions, but deployments pinned to older server versions may need adjustments.
- All JavaScript code fences were checked for syntax with Node.js after the corrections.
