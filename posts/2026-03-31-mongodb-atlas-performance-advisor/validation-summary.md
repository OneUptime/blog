# Validation Summary: How to Use MongoDB Atlas Performance Advisor for Index Suggestions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Performance Advisor
- MongoDB Atlas UI and API
- MongoDB Atlas CLI (`atlas`)
- mongosh (MongoDB Shell)
- MongoDB indexing (compound indexes, index creation)
- MongoDB query profiler (`db.setProfilingLevel`)

## Sources Consulted
- MongoDB Manual: `db.collection.find()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Manual: `db.collection.createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Index Build on Populated Collections (background option deprecation) — https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Atlas CLI: `atlas clusters indexes create` — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-indexes-create/
- MongoDB Atlas: Performance Advisor documentation — https://www.mongodb.com/docs/atlas/performance-advisor/
- MongoDB Atlas Admin API: Suggested Indexes endpoint — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Performance-Advisor

## Issues Found

### 1. Incorrect `find()` sort syntax (Query Shapes section)
- **What was wrong:** The second argument to `db.collection.find()` was used as `{ "sort": { "createdAt": -1 } }`. In MongoDB, the second argument to `find()` is the projection document, not an options object. Sort must be applied by chaining `.sort()`.
- **What was changed:** Replaced `db.orders.find({ "status": "pending" }, { "sort": { "createdAt": -1 } })` with `db.orders.find({ "status": "pending" }).sort({ "createdAt": -1 })`.
- **Why:** The original code would not sort results; it would instead project a non-existent `sort` field. This is a functional bug that would confuse readers trying to replicate the query.

### 2. Deprecated `background: true` option in `createIndex()` (Via mongosh section)
- **What was wrong:** The `createIndex()` call included `{ background: true }` as an option. The `background` option was deprecated in MongoDB 4.2 and is ignored in all subsequent versions. Since Atlas runs MongoDB 4.2+, this option has no effect.
- **What was changed:** Removed `background: true` from the options document, keeping only `{ name: "status_createdAt_idx" }`.
- **Why:** Including a deprecated option misleads readers into thinking it controls index build behavior. MongoDB 4.2+ uses an optimized index build process automatically.

### 3. Incorrect Atlas CLI syntax (Via Atlas CLI section)
- **What was wrong:** The index name was passed as `--indexName "status_createdAt_idx"` flag. In the Atlas CLI, the index name is a positional argument, not a named flag.
- **What was changed:** Moved the index name to the positional argument position: `atlas clusters indexes create status_createdAt_idx ...` and removed the `--indexName` flag.
- **Why:** Using `--indexName` would cause the command to fail with an unknown flag error.

## Review Notes
- The Atlas API sample response structure (lines 139-153) is illustrative but does not precisely match the actual API response schema (e.g., `impact_score` is not a real field; the actual API uses `weight`). Since it is clearly labeled as a "Sample response" and serves an illustrative purpose, it was left as-is, but readers integrating with the API should consult the official API reference.
- The `db.orders.stats({ indexDetails: true }).indexSizes` example works but `indexDetails: true` is not needed to access `indexSizes` — that field is present in the base `stats()` output. The `indexDetails` flag provides WiredTiger internal metrics per index.
- The comparison table correctly distinguishes Performance Advisor from Query Profiler. The claim that Performance Advisor has "Up to 7 days" of history is accurate for M10+ clusters.
- The `db.setProfilingLevel(1, { slowms: 50 })` command is syntactically correct. Note that on Atlas, the slow operation threshold can also be configured via the Atlas UI under cluster settings.
