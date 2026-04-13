# Validation Summary: How to Set Size and Max Document Limits for Capped Collections in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (capped collections, `createCollection`, `collMod`, `db.collection.stats()`, `db.collection.options()`)

## Sources Consulted
- MongoDB official documentation: `db.createCollection()` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB official documentation: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB 6.0 release notes (collMod support for cappedSize/cappedMax) — https://www.mongodb.com/docs/manual/release-notes/6.0/

## Issues Found

1. **Incorrect size calculation in the workload table (line 89)**: The "Background job audit" row listed a recommended size of 12 MB for ~1 week retention at 10 docs/sec with 2 KB average doc size. The correct math is: 10 docs/sec × 2,048 bytes × 604,800 seconds/week = ~12.4 GB. Changed 12 MB to 12 GB.

2. **Incorrect claim that `collMod` cannot modify capped collections (lines 91-93)**: The post stated "Capped collection size and max cannot be changed with `collMod`." This is only true for MongoDB versions before 6.0. Starting with MongoDB 6.0, the `collMod` command supports `cappedSize` and `cappedMax` parameters to modify capped collection limits in place. Updated the section to show the `collMod` approach for MongoDB 6.0+ and retained the drop-and-recreate approach as a fallback for older versions.

## Review Notes
- `db.collection.stats()` was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The shell helper still works in mongosh (it uses `$collStats` internally), but authors may want to update the example in a future revision to use the aggregation approach for forward-compatibility.
- The minimum `size` of 4096 bytes is correct per current MongoDB documentation.
- The first two rows of the workload table check out mathematically (1,000 × 300 × 3,600 ≈ 1 GB; 10,000 × 100 × 600 ≈ 600 MB).
