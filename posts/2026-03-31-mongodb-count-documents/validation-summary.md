# Validation Summary: How to Count Documents in MongoDB with countDocuments()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (mongosh shell methods)
- `db.collection.countDocuments()` method
- `db.collection.estimatedDocumentCount()` method
- MongoDB Aggregation Pipeline (`$group`, `$count`, `$facet`, `$match`)

## Sources Consulted
- MongoDB official documentation for `db.collection.countDocuments()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
- MongoDB official documentation for `db.collection.estimatedDocumentCount()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.estimatedDocumentCount/
- MongoDB official documentation for `$facet` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB official documentation for `$count` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/
- MongoDB official documentation for `$group` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB deprecation notice for `db.collection.count()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.count/

## Issues Found
No technical issues found.

## Review Notes
- The `countDocuments()` syntax, options (`limit`, `skip`, `hint`, `maxTimeMS`), and behavior are all accurately described per the official MongoDB documentation.
- The `estimatedDocumentCount()` description correctly notes it does not accept a filter and relies on collection metadata, which can be stale after unclean shutdown.
- The comparison table accurately contrasts the two methods.
- The aggregation examples (`$group` with `$sum: 1`, `$facet` with `$count`) use correct syntax and produce the described output shapes.
- The deprecation warning for `count()` is accurate — it has been deprecated since MongoDB 4.0 in favor of `countDocuments()` and `estimatedDocumentCount()`.
- The performance note about `countDocuments({})` performing a full collection scan is directionally correct. In MongoDB 5.0+ there are some internal optimizations, but `estimatedDocumentCount()` remains significantly faster for full-collection counts, making the post's advice sound.
