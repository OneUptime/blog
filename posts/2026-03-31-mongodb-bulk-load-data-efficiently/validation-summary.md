# Validation Summary: How to Bulk Load Data into MongoDB Efficiently

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server, shell commands)
- PyMongo (Python MongoDB driver)
- mongoimport (MongoDB Database Tools)
- mongostat (MongoDB Database Tools)

## Sources Consulted
- MongoDB Manual — Index Builds on Populated Collections: https://www.mongodb.com/docs/manual/core/index-creation/
- MongoDB Manual — Limits and Thresholds: https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Manual — Bulk Write Operations: https://www.mongodb.com/docs/manual/core/bulk-write-operations/
- MongoDB Database Tools — mongoimport: https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB Database Tools — mongostat: https://www.mongodb.com/docs/database-tools/mongostat/
- PyMongo Documentation — Bulk Write Operations: https://pymongo.readthedocs.io/en/stable/examples/bulk.html
- PyMongo Documentation — Results: https://pymongo.readthedocs.io/en/stable/api/pymongo/results.html
- mongo-tools source code (mongoimport/options.go): https://github.com/mongodb/mongo-tools/blob/master/mongoimport/options.go

## Issues Found

1. **Deprecated `background: true` option on `createIndex`**: The post used `{ background: true }` when creating indexes after the bulk load. This option was deprecated in MongoDB 4.2 and is silently ignored in all versions since. MongoDB 4.2+ uses an optimized index build process that only holds an exclusive lock at the start and end of the build. Removed the `background: true` option and updated the comment from "rebuild in background" to "rebuild indexes".

2. **Incorrect 16MB batch size limit claim**: The post stated "Batch sizes that exceed 16MB total will be rejected by MongoDB." This is wrong — the 16MB limit applies to individual BSON documents, not to batch totals. PyMongo (and other drivers) automatically split large `insert_many` calls into sub-batches that respect the 48MB wire protocol message limit and the 100,000 operations-per-batch limit. Corrected the text to accurately state the individual document limit and driver auto-splitting behavior.

3. **Unused `WriteConcern` import**: The "Tuning Write Concern" code snippet imported `from pymongo.write_concern import WriteConcern` but never used the `WriteConcern` class — write concern was set via `MongoClient` constructor parameters (`w=`, `j=`) instead. Removed the unused import.

## Review Notes
- The `mongoimport --batchSize` flag is valid but undocumented in official docs (it exists in the source code with a default of 1000). This is acceptable but readers may not find it in `--help` output on all versions.
- With `w=0` (unacknowledged) write concern shown in the tuning section, `BulkWriteError` cannot be caught and `inserted_ids` cannot be accessed. The blog's `bulk_insert` function uses `w=1` so this is not a bug in the code, but users should be aware that switching to `w=0` would require changing the error handling logic as well.
- The `mongostat --rowcount 0 1` command is valid but functionally equivalent to just `mongostat` since both `--rowcount 0` and `1` second polling interval are defaults.
