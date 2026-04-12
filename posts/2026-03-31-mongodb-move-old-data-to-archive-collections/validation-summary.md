# Validation Summary: How to Move Old Data to Archive Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation pipeline, `$merge` stage, `deleteMany`, `createCollection`, `createIndex`)
- MongoDB WiredTiger storage engine (zstd compression)
- MongoDB Atlas Scheduled Triggers (App Services)
- JavaScript (mongosh / Node.js driver)

## Sources Consulted
- MongoDB `$merge` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
- MongoDB `$out` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB `deleteMany` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.deleteMany/
- MongoDB `createCollection` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB WiredTiger compression options: https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger
- MongoDB Atlas Triggers documentation: https://www.mongodb.com/docs/atlas/app-services/triggers/scheduled-triggers/

## Issues Found

1. **Step 3 text referenced `$out` instead of `$merge`**: The introductory sentence said "Use `$out` in an aggregation pipeline to bulk-copy documents" but the code correctly used `$merge`. These are fundamentally different stages — `$out` replaces the entire target collection, while `$merge` can insert into or update an existing collection. Using `$out` would be destructive if the archive collection already had data from previous runs. Changed the text to reference `$merge`.

2. **Step 5 batched deletion used non-existent `limit` option on `deleteMany`**: The code passed `{ limit: 1000 }` as an option to `deleteMany`, but `deleteMany` does not support a `limit` parameter. The code would silently ignore the option and delete all matching documents on the first iteration, defeating the purpose of batching. Replaced with a correct batching pattern that uses `find().limit(1000)` to fetch a batch of `_id` values, then deletes those specific documents with `$in`.

## Review Notes
- The Atlas Trigger example in Step 6 does not include the verification step (Step 4) before deletion. In a production automation, skipping verification increases risk if the `$merge` silently fails or partially completes. This is not technically wrong but worth noting for readers implementing this in production.
- The `sleep()` function used in the batching example is available in `mongosh` but not in standard Node.js. Readers using the Node.js driver directly would need to use a `setTimeout`-based delay or `await new Promise(r => setTimeout(r, 100))` instead.
