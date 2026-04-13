# Validation Summary: How to Use $sort in MongoDB Aggregation Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$sort` pipeline stage
- `$group`, `$match`, `$addFields`, `$limit`, `$unwind` pipeline stages
- MongoDB indexing (compound indexes)
- `$text` / `$meta` text search scoring
- `allowDiskUse` option

## Sources Consulted
- MongoDB official documentation: `$sort` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
- MongoDB official documentation: Aggregation Pipeline Optimization — https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- MongoDB official documentation: `$meta` expression — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB official documentation: `$text` operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official documentation: Indexes and Aggregation — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/#pipeline-operators-and-indexes

## Issues Found
1. **Incorrect claim about stable sort behavior (line 146):** The post stated "MongoDB's `$sort` is stable — documents with equal sort keys maintain their relative order." This is incorrect. MongoDB's official documentation states that documents with equal sort key values may be returned in any order — the sort is **not** guaranteed to be stable. Fixed by rewriting the section to accurately describe the non-deterministic behavior and recommending inclusion of a unique field (e.g., `_id`) as a tiebreaker to achieve deterministic ordering. The section heading was also renamed from "Stable Sort Behavior" to "Sort Consistency" to avoid implying stability.

## Review Notes
- All code examples use correct MongoDB shell syntax and valid aggregation operators.
- The `$sort` + `$limit` optimization description is accurate — MongoDB does coalesce these into a top-N heap operation.
- The 100MB memory limit for in-memory sorts and the `allowDiskUse` option are correctly described.
- The index-backed sorting explanation is accurate — a compound index on `{ status: 1, createdAt: -1 }` supports the `$match` + `$sort` pattern shown.
