# Validation Summary: How to Restore Specific Collections from a MongoDB Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongorestore (MongoDB Database Tools)
- mongodump

## Sources Consulted
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB mongorestore --nsFrom/--nsTo documentation: https://www.mongodb.com/docs/database-tools/mongorestore/#std-option-mongorestore.--nsFrom
- MongoDB mongorestore --nsInclude documentation: https://www.mongodb.com/docs/database-tools/mongorestore/#std-option-mongorestore.--nsInclude

## Issues Found

1. **Missing `--nsInclude` in `--nsFrom`/`--nsTo` examples**: The `--nsFrom` and `--nsTo` flags only rename namespaces during restore — they do not filter which collections are restored. Without `--nsInclude`, all collections from the dump directory would be restored, not just the intended one. Added `--nsInclude` to both examples that used `--nsFrom`/`--nsTo` (the "Restoring to a Different Collection Name" section and the "Common Use Cases" staging example).

2. **Inaccurate description of default behavior without `--drop`**: The post stated that mongorestore "merges documents" without `--drop`. This is misleading — mongorestore inserts documents from the backup and skips any document whose `_id` already exists (logging a duplicate key error). There is no field-level merging. Updated the wording to accurately describe the insert-and-skip behavior.

## Review Notes
- The `--db` and `--collection` flags shown in the first example are deprecated in MongoDB Database Tools 100.0.0+ (shipping with MongoDB 4.4+). The post correctly notes that `--nsInclude` is "the recommended way," so this is acceptable as a legacy alternative, but readers on modern versions should prefer `--nsInclude`.
- The `--numParallelCollections` default is already 4 in mongorestore, so the example using `--numParallelCollections 4` would not change behavior unless the default has been altered. The example still serves as a useful illustration of the flag.
