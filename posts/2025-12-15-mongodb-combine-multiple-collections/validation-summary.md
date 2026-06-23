# Validation Summary: How to Combine Multiple Collections in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB aggregation pipeline
- `$lookup`
- `$unionWith`
- `$graphLookup`
- `$unwind`
- MongoDB ObjectId
- MongoDB Node.js driver
- MongoDB indexing and denormalization patterns

## Sources Consulted
- MongoDB Manual: `$lookup` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual: `$unionWith` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionwith/
- MongoDB Manual: `$graphLookup` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphlookup/
- MongoDB Manual: `$unwind` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- MongoDB Manual: `ObjectId()` mongosh method: https://www.mongodb.com/docs/manual/reference/method/objectid/
- MongoDB Node.js Driver: Generate Custom Values for `_id`: https://www.mongodb.com/docs/drivers/node/current/crud/pkfactory/

## Issues Found
- Several example documents used placeholder `ObjectId()` values such as `ObjectId("order1")`, `ObjectId("cust1")`, `ObjectId("manager1")`, and `ObjectId("prod1")`. These are not valid ObjectId inputs because MongoDB ObjectId hex strings must be 24 hexadecimal characters. Replaced them with valid 24-character hexadecimal ObjectId strings.
- The Node.js `getOrderDetails()` example used `ObjectId(orderId)` without making the driver constructor explicit. Updated the snippet to import `ObjectId` from `mongodb` and use `new ObjectId(orderId)`, matching native driver usage.
- The indexing example suggested adding an index on `orders.customerId` in a section about optimizing the foreign side of `$lookup`, and showed a `products` compound index that did not match the shown lookup predicates. Updated the example to keep the automatically created `_id` index on `customers` and show a relevant compound index for a foreign collection pipeline lookup: `db.posts.createIndex({ authorId: 1, createdAt: -1 })`.

## Review Notes
- The `$lookup` examples using `localField`, `foreignField`, and `pipeline` together rely on MongoDB's concise correlated subquery syntax introduced in MongoDB 5.0. This is current behavior, but older MongoDB versions require the equality condition to be expressed inside the pipeline with `let` and `$expr`.
- `$unionWith` behaves like `UNION ALL`: it can include duplicates, and output order is unspecified unless a later `$sort` is applied. The post's examples sort after unioning where ordered output is needed.
