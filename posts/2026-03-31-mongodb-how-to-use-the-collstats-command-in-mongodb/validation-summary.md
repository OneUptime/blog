# Validation Summary: How to Use the collStats Command in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collStats command, db.collection.stats() helper)
- MongoDB Shell (mongosh / legacy mongo shell)
- WiredTiger storage engine (referenced in output)

## Sources Consulted
- MongoDB official documentation: collStats command (https://www.mongodb.com/docs/manual/reference/command/collStats/)
- MongoDB official documentation: db.collection.stats() (https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/)
- MongoDB official documentation: $collStats aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/)
- MongoDB 6.2 release notes regarding deprecation of collStats

## Issues Found
No technical issues found.

## Review Notes
- The `collStats` command and `db.collection.stats()` helper were deprecated in MongoDB 6.2 (released 2023) in favor of the `$collStats` aggregation stage. The commands still function in current MongoDB versions but may be removed in a future release. A future update to this post could mention the deprecation and show the aggregation-based alternative.
- The post correctly demonstrates that the `scale` parameter only affects size-related fields and not `count`, which remains an integer document count.
- The index sizes in the example output are internally consistent (individual index sizes sum to `totalIndexSize`).
- The `toLocaleString()` and `toFixed()` JavaScript methods used in the scripts work in both `mongosh` (Node.js-based) and the legacy `mongo` shell.
