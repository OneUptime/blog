# Validation Summary: How to Create a Text Index on All String Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, wildcard text indexes, full-text search)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB official documentation on text indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB official documentation on `$text` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on text index weights: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/specify-weights/

## Issues Found
1. **Incorrect claim about field-level weights with `$**` wildcard text index.**
   - **What was wrong:** The post stated "field-level weights cannot be set with `$**` since all fields are treated equally." This is incorrect. MongoDB allows you to specify a `weights` option even with a `$**` wildcard text index, letting you boost specific fields while still indexing all string fields. Fields not listed in the `weights` option receive the default weight of 1.
   - **What was changed:** Replaced the incorrect statement with an accurate explanation and a code example showing how to use `weights` with the wildcard text index. The previous standalone code example (which only showed `default_language` and `textIndexVersion`) was integrated into the new, more complete example.
   - **Why:** The MongoDB documentation explicitly supports setting weights on wildcard text indexes, and this is a useful feature that readers should know about rather than being told it doesn't exist.

## Review Notes
- The `db.articles.stats().indexSizes` method works but `db.collection.stats()` is considered a legacy wrapper in MongoDB 6.0+. The preferred approach is `db.collection.aggregate([{$collStats: {storageStats: {}}}])`. However, the legacy method still functions correctly, so this is not an error — just something to note for future updates.
- The post correctly distinguishes between wildcard text indexes (`$**` with `"text"`) and wildcard indexes (`$**` with `1`), which are separate MongoDB features. No confusion was introduced.
