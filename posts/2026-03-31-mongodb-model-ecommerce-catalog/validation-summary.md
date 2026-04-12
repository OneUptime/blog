# Validation Summary: How to Model an E-Commerce Product Catalog in MongoDB

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (document schemas, indexes, aggregation framework)
- MongoDB Node.js Driver (async/await queries, aggregation cursors)
- MongoDB Aggregation Pipeline (`$lookup`, `$facet`, `$bucket`, `$group`, `$unwind`)
- MongoDB Indexing (compound indexes, multikey indexes, unique indexes)
- MongoDB Attribute Pattern for polymorphic schemas

## Sources Consulted
- MongoDB `$bucket` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB `$facet` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB `$lookup` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB `$inc` update operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB `$slice` projection operator documentation: https://www.mongodb.com/docs/manual/reference/operator/projection/slice/
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Data Modeling patterns (Attribute Pattern): https://www.mongodb.com/blog/post/building-with-patterns-the-attribute-pattern

## Issues Found
1. **Ratings `$bucket` boundary off-by-one (line 291)**: The `boundaries` array for the ratings bucket was `[1, 2, 3, 4, 4.5, 5]`. MongoDB `$bucket` creates half-open ranges `[lower, upper)`, so the last range was `[4.5, 5)`. A rating of exactly `5.0` would fall outside all ranges and be routed to the `default` bucket labeled `"unrated"` — clearly incorrect for a perfect 5-star rating. Changed the upper boundary to `5.01` so that ratings of exactly `5.0` are captured in the `[4.5, 5.01)` bucket.

## Review Notes
- The `listProducts` function fetches a category document on line 192 (`const category = await db.collection("categories").findOne(...)`) but never uses the result. The filter queries `categoryPath` directly with the slug string. This is dead code — likely intended as a placeholder for category existence validation — but not technically wrong, just unnecessary.
- The ER diagram shows `InventoryRecord` as a separate entity linked to `Variant`, but in the actual schemas, inventory is embedded within the variant document. The diagram is conceptual and not misleading, but readers should note the schema embeds inventory rather than using a separate collection.
- The Attribute Pattern section at the end uses a different `attributes` shape (array of `{name, value, unit}` objects) than the product schema earlier (plain key-value object). This is intentional — the post shows two different approaches for two different purposes — but could confuse readers who don't read carefully.
