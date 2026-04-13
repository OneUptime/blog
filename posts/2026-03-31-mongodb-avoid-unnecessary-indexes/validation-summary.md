# Validation Summary: How to Avoid Unnecessary Indexes in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Aggregation Framework (`$indexStats`)
- MongoDB Index Management (`createIndex`, `dropIndex`, `hideIndex`, `getIndexes`)
- MongoDB Query Planner (`explain("executionStats")`)

## Sources Consulted
- MongoDB Manual: $indexStats Aggregation Pipeline Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB Manual: Index Prefixes (Compound Indexes) — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/#prefixes
- MongoDB Manual: db.collection.hideIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.hideIndex/
- MongoDB Manual: db.collection.dropIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.dropIndex/
- MongoDB Manual: db.collection.getIndexes() — https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/
- MongoDB Manual: explain("executionStats") — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Manual: Hidden Indexes — https://www.mongodb.com/docs/manual/core/index-hidden/

## Issues Found
No technical issues found.

## Review Notes
- The `hideIndex()` feature requires MongoDB 4.4 or later. The post does not mention a minimum version, which is fine for a current-focused guide but worth noting if readers are on older deployments.
- The "3x more index write operations" comparison (3 useful vs 12 total indexes) is technically correct in the additive sense (9 additional = 3x more than the base 3), though some readers may interpret it as "3x as many" rather than "4x as many." This is a minor phrasing ambiguity, not a technical error.
- The `explain()` output path `winningPlan.inputStage.indexName` is accurate for the classic query engine. MongoDB 5.0+ with the slot-based execution engine (SBE) may present a slightly different structure (`queryPlan.inputStage`), but the comment serves as a reasonable general pointer.
