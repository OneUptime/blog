# Validation Summary: How to Use db.collection.totalSize() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell methods: `totalSize()`, `storageSize()`, `totalIndexSize()`, `stats()`, `getCollectionNames()`)
- MongoDB `$indexStats` aggregation stage

## Sources Consulted
- MongoDB official documentation for `db.collection.totalSize()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.totalSize/
- MongoDB official documentation for `db.collection.stats()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB official documentation for `db.collection.storageSize()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.storageSize/
- MongoDB official documentation for `db.collection.totalIndexSize()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.totalIndexSize/

## Issues Found
1. **`stats.totalSize` does not exist in `db.collection.stats()` output** — In the "Understanding Document vs Index Ratio" section, the code used `stats.totalSize` to compute percentages. The `stats()` method returns `storageSize` and `totalIndexSize` as separate fields but does not include a `totalSize` field. Referencing `stats.totalSize` yields `undefined`, causing the percentage calculations to produce `NaN`. Fixed by computing `totalSize` manually as `stats.storageSize + stats.totalIndexSize`.

## Review Notes
- The core claim that `totalSize() = storageSize() + totalIndexSize()` is accurate per MongoDB documentation.
- The `db[name].totalSize()` pattern used in the collection comparison loop works in the mongo shell but may fail for collection names containing special characters (e.g., names with dots or hyphens). This is a minor edge case and acceptable for a tutorial.
- The `db.collection.stats()` method has been noted as potentially deprecated in favor of the `$collStats` aggregation stage in newer MongoDB versions. The shell helper still works but authors may want to update to `$collStats` in the future.
