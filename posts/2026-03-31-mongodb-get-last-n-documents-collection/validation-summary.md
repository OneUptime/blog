# Validation Summary: How to Get the Last N Documents from a Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell commands)
- MongoDB Aggregation Framework
- MongoDB Node.js Driver
- MongoDB Indexing

## Sources Consulted
- MongoDB official documentation for `db.collection.find()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB official documentation for `db.collection.findOne()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/
- MongoDB official documentation for `cursor.sort()` — https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
- MongoDB official documentation for `$natural` sort — https://www.mongodb.com/docs/manual/reference/operator/meta/natural/
- MongoDB official documentation for Aggregation Pipeline stages (`$match`, `$sort`, `$limit`, `$project`) — https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB official documentation for `createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation for `explain()` — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB official documentation for Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB official documentation for ObjectId — https://www.mongodb.com/docs/manual/reference/bson-types/#objectid

## Issues Found
No technical issues found.

## Review Notes
- The mongosh `findOne(query, projection, options)` three-argument form (used in the "Getting the Absolute Last Document" section) was introduced in mongosh 2.1.0. Users on older mongosh versions would need to use `find().sort().limit(1)` instead. This is not an error since current mongosh supports it, but worth noting for readers on older versions.
- The compound index example `{ service: 1, timestamp: -1 }` correctly follows the Equality-Sort-Range (ESR) rule by placing the equality field (`service`) before the sort field (`timestamp`), which is good practice.
- The post correctly warns that `$natural` order is unreliable for regular (non-capped) collections under WiredTiger, which is an important caveat many tutorials omit.
