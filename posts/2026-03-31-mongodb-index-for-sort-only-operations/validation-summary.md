# Validation Summary: How to Index for Sort-Only Operations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (indexing, query optimization, profiler)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Documentation: Database Profiler Output — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Documentation: Indexes — https://www.mongodb.com/docs/manual/indexes/
- MongoDB Documentation: Sort and Index Use — https://www.mongodb.com/docs/manual/tutorial/sort-results-with-indexes/
- MongoDB Documentation: Covered Queries — https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query
- MongoDB Documentation: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Source Code: plan_explainer_impl.cpp (confirms planSummary only includes leaf-node stages)

## Issues Found
1. **Incorrect profiler query for detecting in-memory sorts.** The post used `db.system.profile.find({ planSummary: /SORT/ })` to detect in-memory sorts. The `planSummary` field in `system.profile` documents only contains leaf-node data access stages (e.g., `IXSCAN`, `COLLSCAN`) and never includes `SORT`. The correct field is `hasSortStage`, a boolean that is `true` when MongoDB performs an in-memory sort. Changed the query to `db.system.profile.find({ hasSortStage: true })` and updated the surrounding description accordingly.

## Review Notes
- The 100 MB in-memory sort limit is correct for MongoDB 4.4+ (controlled by `internalQueryMaxBlockingSortMemoryUsageBytes`). Earlier versions used a 32 MB limit. The post does not specify a version, which is fine since 100 MB is the current default.
- The comment "Newest first (by insertion order)" for `sort({ _id: -1 })` is a reasonable approximation when using default ObjectIds (which embed a timestamp), but is not strictly accurate if custom `_id` values are used. This is a minor nuance and not an error for a practical tutorial.
- All other code examples, index strategies, sort direction rules, ESR pattern, and covered query explanations are technically accurate.
