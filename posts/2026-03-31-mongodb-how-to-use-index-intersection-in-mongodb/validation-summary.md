# Validation Summary: How to Use Index Intersection in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (query planner, index intersection)
- MongoDB Shell (mongosh) commands
- MongoDB explain plans (AND_SORTED, AND_HASH stages)
- MongoDB indexing (single-field indexes, compound indexes)
- MongoDB $indexStats aggregation stage

## Sources Consulted
- MongoDB official documentation on Index Intersection: https://www.mongodb.com/docs/manual/core/index-intersection/
- MongoDB official documentation on explain() results and query plan stages: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation on $indexStats: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB official documentation on createIndex(): https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found

1. **Incorrect term "ObjectIds" for index intersection mechanism** (Line 19): The post stated MongoDB "collects document IDs (ObjectIds)" during index intersection. MongoDB uses internal RecordIds (record pointers) to perform the intersection, not ObjectIds. The `_id` field can be any BSON type and is unrelated to the internal intersection mechanism. Fixed by changing to "collects internal record IDs."

2. **Misleading description of AND_SORTED** (Line 41): The post described AND_SORTED as "more efficient for range queries." AND_SORTED works by merging two index result streams that are both sorted by RecordId — it is about the ordering of the result streams, not specifically about range query predicates. Fixed the description to accurately reflect the merge-based mechanism.

## Review Notes
- The limitation stating "Index intersection does not support sort operations" is a simplification. In some cases, one index can provide the sort while another provides predicate filtering. However, the query planner rarely chooses this in practice, so the statement captures the practical reality well enough for a blog post.
- The $indexStats monitoring section is valid but could note that $indexStats shows per-index usage counts rather than directly indicating intersection — users need to infer intersection from seeing multiple single-field indexes used for the same query pattern.
- All JavaScript/mongosh code examples use correct syntax and current APIs.
- The explain() verbosity levels ("executionStats" and "allPlansExecution") are correctly used.
