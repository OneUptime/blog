# Validation Summary: How to Back Up a Replica Set in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongodump, mongorestore)
- MongoDB Replica Sets
- MongoDB oplog
- BSON Timestamp format

## Sources Consulted
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB replica set configuration documentation: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB rs.add() documentation: https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB read preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/

## Issues Found
No technical issues found.

## Review Notes
- All mongodump and mongorestore flags are correct and current.
- The `--oplog` flag is correctly used only with full database dumps (never combined with `--db`), which is a common pitfall the post avoids.
- The `rs.add()` syntax for adding a hidden backup secondary with `priority: 0`, `hidden: true`, and `votes: 0` is correct.
- The `--oplogLimit` timestamp format (`seconds:ordinal`) is correctly described as BSON Timestamp format.
- The `--dryRun` flag for mongorestore verification is a useful but lesser-known feature; its inclusion is accurate.
- The post correctly avoids combining `--readPreference` with a direct host connection (the dedicated backup secondary section connects directly without `--readPreference`, which is correct behavior).
- Minor note: secondaries may have replication lag, so a backup from a secondary reflects the secondary's state at dump time, not necessarily the primary's exact current state. The post doesn't explicitly mention this caveat but it doesn't make any incorrect claims either.
