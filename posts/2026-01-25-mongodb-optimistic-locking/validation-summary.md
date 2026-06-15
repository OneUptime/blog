# Validation Summary: How to Implement Optimistic Locking in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- MongoDB Node.js Driver
- JavaScript
- Optimistic locking
- MongoDB transactions
- MongoDB indexes

## Sources Consulted
- MongoDB Manual: Atomicity and Transactions - https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
- MongoDB Node.js Driver: Transactions - https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- MongoDB Node.js Driver API: MongoClient - https://mongodb.github.io/node-mongodb-native/6.15/classes/MongoClient.html
- MongoDB Node.js Driver API: Collection - https://mongodb.github.io/node-mongodb-native/6.15/classes/Collection.html
- MongoDB Node.js Driver 6.0.0 release notes: findOneAndX return behavior - https://www.mongodb.com/community/forums/t/mongodb-nodejs-driver-6-0-0-released/241691
- MongoDB Manual: Indexes - https://www.mongodb.com/docs/manual/indexes/

## Issues Found
- The transaction example called `this.orders.client.startSession()`. The official Node.js driver starts sessions from a `MongoClient` instance, and the public `Collection` API does not expose a `client` accessor. I changed the `OrderService` constructor to accept `client` and start the session with `this.client.startSession()`.
- The performance section said to index `{ _id: 1, __v: 1 }` for efficient optimistic updates. MongoDB creates a default unique `_id` index, so updates that match by `_id` and version are already anchored by `_id`. I changed the note to explain that compound indexes are useful when optimistic updates match on fields other than `_id`, and adjusted the example index to `{ productId: 1, __v: 1 }`.

## Review Notes
The examples use current MongoDB Node.js driver behavior where `findOneAndUpdate()` returns the matched document or `null` by default in driver 6.x and later. Older driver versions returned a metadata wrapper unless configured with `includeResultMetadata: false`, so readers on old drivers may need to adapt the return handling.
