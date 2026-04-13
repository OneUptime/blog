# Validation Summary: How to Detect Sort in Memory in MongoDB Explain Plans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query engine, explain plans, indexing)
- MongoDB Shell (mongosh)
- MongoDB compound indexes and ESR rule

## Sources Consulted
- MongoDB official documentation: `explain()` results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB official documentation: `internalQueryMaxBlockingSortMemoryUsageBytes` parameter — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.internalQueryMaxBlockingSortMemoryUsageBytes
- MongoDB official documentation: `allowDiskUse` for find — https://www.mongodb.com/docs/manual/reference/method/cursor.allowDiskUse/
- MongoDB official documentation: `currentOp` output fields — https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB official documentation: ESR (Equality-Sort-Range) rule — https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-rule/
- MongoDB 4.4 release notes (sort memory limit change) — https://www.mongodb.com/docs/manual/release-notes/4.4/

## Issues Found

1. **Incorrect `allowDiskUse` description**: The post stated "32MB default memory limit (100MB with `allowDiskUse`)" which was wrong in two ways: (a) the default sort memory limit has been 100MB since MongoDB 4.4 (controlled by `internalQueryMaxBlockingSortMemoryUsageBytes`), not 32MB; (b) `allowDiskUse` does not set a 100MB limit — it allows MongoDB to spill sort data to disk when the in-memory limit is exceeded, with no fixed disk cap. Fixed to accurately describe the 100MB default and the role of `allowDiskUse`.

2. **Outdated `memLimit` values in explain output examples**: Both explain output examples showed `memLimit: 33554432` (32MB), which is the pre-4.4 default. Updated to `104857600` (100MB) to reflect the modern default since MongoDB 4.4.

3. **Incorrect SORT_KEY_GENERATOR description**: The post claimed `SORT_KEY_GENERATOR` "appears when projections are involved with in-memory sorts." This is inaccurate — `SORT_KEY_GENERATOR` is a standard stage in the in-memory sort pipeline (introduced in MongoDB 5.0+) that extracts sort key values from documents, regardless of whether projections are used. Fixed the description.

4. **Deprecated field name in audit script**: The audit script used `op.query` to access query details from `currentOp()` output, which was deprecated in MongoDB 4.2+ in favor of `op.command`. Updated to use `op.command` and `op.command.filter`.

5. **Outdated limit reference in summary**: The summary section referenced "32MB limit violations." Updated to "memory limit violations" with a note about the 100MB default since MongoDB 4.4.

## Review Notes
- The ESR (Equality-Sort-Range) rule explanation and examples are accurate and well-presented.
- The index direction matching rule (exact match or exact reverse) is correctly explained.
- The audit script, while functional after the fix, uses a simplistic string-matching approach (`JSON.stringify(plan).includes(...)`) that works but is fragile. A recursive function traversing the plan tree would be more robust, but this is a style preference rather than a correctness issue.
- Starting with MongoDB 6.0, `allowDiskUseByDefault` is enabled by default, meaning sorts automatically spill to disk. The post could mention this in a future update but it doesn't affect the core guidance about detecting SORT stages.
