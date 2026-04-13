# Validation Summary: How to Use Stored Source in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Search
- MongoDB Aggregation Pipeline (`$search` stage)
- Atlas Search `storedSource` index option
- Atlas Search `returnStoredSource` query option

## Sources Consulted
- MongoDB Atlas Search Stored Source Definition documentation (https://www.mongodb.com/docs/atlas/atlas-search/stored-source-definition/)
- MongoDB Atlas Search Index Definitions reference (https://www.mongodb.com/docs/atlas/atlas-search/index-definitions/)
- MongoDB Atlas Search $search stage documentation (https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/)
- MongoDB Atlas Search Field Types reference (https://www.mongodb.com/docs/atlas/atlas-search/field-types/)
- MongoDB Atlas Search Explain documentation (https://www.mongodb.com/docs/atlas/atlas-search/explain/)
- MongoDB Atlas Search Metrics documentation (https://www.mongodb.com/docs/atlas/atlas-search/review-atlas-search-metrics/)

## Issues Found
1. **Incorrect description of `storedSource: true` behavior (line 23)**: The post stated that `storedSource: true` stores "all indexed fields." Per the official documentation, it stores all fields in the documents, not just those that are indexed. Fixed wording to "store all fields in the documents."

2. **Fabricated explain output field (line 85)**: The post claimed you could verify stored source usage by looking for `REQUIRES_MONGODB_EXPRESSION_EXECUTION: false` in the explain output. This field does not exist in the documented Atlas Search explain output. Replaced with an accurate description: when `returnStoredSource` is enabled, the `$_internalSearchIdLookup` stage skips the full document lookup.

3. **Misleading `collStats` usage for Atlas Search index sizes (lines 103-106)**: The post suggested using `db.runCommand({ collStats: "products" })` to profile Atlas Search index sizes. The `collStats` command only reports standard MongoDB collection/index statistics, not Atlas Search index sizes, which are managed by the separate `mongot` process. Replaced the code block with guidance to use the Atlas UI metrics page or Atlas Admin API.

## Review Notes
- The claim that `$$SEARCH_META` and `searchScore` are always available regardless of stored source configuration is reasonable and consistent with how Atlas Search works (scores are computed by `mongot`), but this is not explicitly guaranteed in the official documentation. The statement is left as-is since it is practically accurate.
- The index definition field types (`string`, `number`) used in examples are correct Atlas Search type names.
- The `returnStoredSource` option name and its placement inside `$search` are correct per official documentation.
