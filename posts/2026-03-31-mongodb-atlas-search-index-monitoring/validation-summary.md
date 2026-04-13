# Validation Summary: How to Monitor Atlas Search Index Performance in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas Search
- mongot (Atlas Search process)
- MongoDB Node.js Driver (`listSearchIndexes`, `createSearchIndex`, `dropSearchIndex`)
- `$searchMeta` aggregation stage
- MongoDB database profiler (`system.profile`)
- Atlas UI metrics and alerts
- Apache Lucene (underlying search engine)

## Sources Consulted
- MongoDB Atlas Search documentation: https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB `listSearchIndexes` reference: https://www.mongodb.com/docs/manual/reference/command/listSearchIndexes/
- MongoDB `$searchMeta` aggregation stage: https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/#-searchmeta
- MongoDB database profiler output reference: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB aggregate command reference: https://www.mongodb.com/docs/manual/reference/command/aggregate/
- MongoDB Atlas alerts documentation: https://www.mongodb.com/docs/atlas/configure-alerts/
- MongoDB `collStats` command reference: https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB `createSearchIndex` driver method: https://www.mongodb.com/docs/drivers/node/current/fundamentals/atlas-search/

## Issues Found

### 1. Incorrect profiler query filter path
- **What was wrong:** The profiler query used `"command.$search": { $exists: true }` to filter for Atlas Search operations. In the `system.profile` collection, aggregate pipeline stages are stored inside the `command.pipeline` array, not directly under `command`. The filter `"command.$search"` would never match any profiler documents.
- **What was changed:** Updated the filter to `"command.pipeline.$search": { $exists: true }`, which correctly queries into the pipeline array for elements containing a `$search` stage.

### 2. Incorrect profiler projection path
- **What was wrong:** The projection used `"command.$search": 1`, which wouldn't return useful data since `$search` is not a direct field of `command`.
- **What was changed:** Updated the projection to `"command.pipeline": 1`, which correctly returns the full pipeline including the `$search` stage.

### 3. Misleading section title for $searchMeta
- **What was wrong:** The section was titled "Using $searchMeta to Check Score Distribution," but the code example only demonstrates retrieving a total result count via `count: { type: "total" }`. Score distribution analysis would involve examining individual document scores or using facets, which is a different concept.
- **What was changed:** Updated the section title to "Using $searchMeta to Check Result Counts" to accurately describe what the code example demonstrates.

## Review Notes
- The `collStats` command used in the "Checking Index Size Impact" section is deprecated in favor of the `$collStats` aggregation stage in MongoDB 6.2+. The command still works but may be removed in a future version. This is acceptable for the current post but worth updating if the post is revised.
- The index status list (BUILDING, READY, STALE, FAILED) covers the most important statuses but omits less common ones like PENDING and DOES_NOT_EXIST. This is reasonable for a monitoring-focused article.
- The `db.setProfilingLevel()` approach works on Atlas dedicated clusters (M10+), which is where Atlas Search is available, so this is consistent.
