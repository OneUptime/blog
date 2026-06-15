# Validation Summary: How to Fix Slow Queries with MongoDB explain()

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- mongosh
- MongoDB explain plans
- MongoDB indexes
- MongoDB aggregation pipelines
- MongoDB database profiler

## Sources Consulted
- MongoDB Manual: `db.collection.explain()` - https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/
- MongoDB Manual: Explain Results - https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Explain Slow Queries - https://www.mongodb.com/docs/manual/tutorial/explain-slow-queries/
- MongoDB Manual: Aggregation Pipeline Limits - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/
- MongoDB Manual: `$sort` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
- MongoDB Manual: `cursor.allowDiskUse()` - https://www.mongodb.com/docs/manual/reference/method/cursor.allowdiskuse/
- MongoDB Manual: Database Profiler - https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: `db.setProfilingLevel()` - https://www.mongodb.com/docs/manual/reference/method/db.setprofilinglevel/
- MongoDB Manual: Compound Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: ESR Guideline - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- MongoDB Manual: `cursor.hint()` - https://www.mongodb.com/docs/manual/reference/method/cursor.hint/
- MongoDB Manual: `$indexStats` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/
- MongoDB Manual: `db.collection.dropIndex()` - https://www.mongodb.com/docs/manual/reference/method/db.collection.dropindex/

## Issues Found
- The post described `totalDocsExamined` as documents fetched from disk. MongoDB's explain metric is about documents examined from the collection; those documents may be served from memory or disk depending on storage/cache state. Changed the description to "Documents examined from the collection."
- The post said MongoDB's 100MB in-memory sort limit always causes query failure when exceeded. Current MongoDB behavior is version/configuration dependent: starting in MongoDB 6.0, stages that require more than 100MB can write temporary files to disk by default when `allowDiskUseByDefault` is enabled; failure occurs when disk use is disabled. Updated the section title and explanation to reflect this.
- The covered-query example said "Perfect output shows no FETCH." MongoDB explain output can differ by execution engine, but the important covered-query signal is an `IXSCAN` that is not under a `FETCH` stage, with `totalDocsExamined` equal to `0`. Changed the comment to focus on that invariant.

## Review Notes
The examples use mongosh syntax and are broadly accurate for modern MongoDB. Explain output structure can vary across MongoDB versions and execution engines, so readers should treat the shown JSON snippets as representative rather than exact output for every deployment.
