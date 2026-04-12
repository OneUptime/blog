# Validation Summary: How to Monitor Disk Usage Per Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongosh (MongoDB Shell)
- Bash scripting
- collStats command
- dbStats command

## Sources Consulted
- MongoDB `collStats` documentation: https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB `dbStats` documentation: https://www.mongodb.com/docs/manual/reference/command/dbStats/
- MongoDB `db.collection.stats()` shell helper: https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB `db.stats()` shell helper: https://www.mongodb.com/docs/manual/reference/method/db.stats/
- MongoDB WiredTiger compression documentation: https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.collectionConfig.blockCompressor

## Issues Found
No technical issues found.

## Review Notes
- The `collStats` command was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The `db.collection.stats()` shell helper still works in current versions of mongosh and remains the most common approach, but future versions may remove it. A note about the `$collStats` aggregation alternative could be useful in a future update.
- The `avgObjSize` field is correctly labeled as bytes — it is not affected by the `scale` parameter, unlike `storageSize`, `totalIndexSize`, and `totalSize`.
- The distinction between `totalIndexSize` (collStats) and `indexSize` (dbStats) field names across the two commands is correctly reflected in the code examples.
- The bash script uses `!` inside double quotes in the `--eval` string, which could trigger history expansion in an interactive shell. Since the script uses `#!/bin/bash` (non-interactive), history expansion is disabled by default, so this is fine as written.
