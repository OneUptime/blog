# Validation Summary: How to Create a Single-Field Index in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (single-field indexes, query optimization)
- MongoDB Shell (mongosh) commands
- MongoDB explain() execution plans

## Sources Consulted
- MongoDB Manual: Single Field Indexes — https://www.mongodb.com/docs/manual/core/index-single/
- MongoDB Manual: createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: explain() — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Manual: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Index Build on Populated Collections — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual: $indexStats — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/

## Issues Found
- **Incorrect claim about index direction for single-field indexes**: The post stated "The direction matters only when combining with other fields in a compound index or when sorting." Per MongoDB documentation, for a single-field index, MongoDB can traverse the index in either direction, so sort order (ascending or descending) of the index key does not matter. Direction only matters for compound indexes. Fixed the sentence to: "For single-field indexes, ascending and descending are equivalent because MongoDB can traverse the index in either direction. The direction matters only when combining with other fields in a compound index."

## Review Notes
- The `db.collection.stats()` method used to check index sizes is deprecated as of MongoDB 6.2 in favor of the `$collStats` aggregation stage or `dbStats`/`collStats` commands. This is not incorrect for earlier versions but may warrant updating if the post targets modern MongoDB.
- The sorting example (`db.articles.find({ status: "published" }).sort({ publishedAt: -1 })`) correctly demonstrates that the index on `publishedAt` satisfies the sort, though readers should note the filter on `status` would not use this particular index — a compound index on `{ status: 1, publishedAt: -1 }` would be more efficient for this specific query pattern.
- The "Best Practices" section mentions "join conditions" — MongoDB uses `$lookup` for joins, not traditional SQL joins. This is a minor terminology nit, not a technical error.
