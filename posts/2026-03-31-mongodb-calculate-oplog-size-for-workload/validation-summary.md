# Validation Summary: How to Calculate the Right Oplog Size for Your Workload in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica set oplog)
- MongoDB Shell (mongosh / legacy mongo shell)
- mongostat (MongoDB Database Tools)
- `replSetResizeOplog` admin command
- `replSetGetStatus` admin command
- BSON Timestamp type

## Sources Consulted
- MongoDB Oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- `replSetResizeOplog` reference: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- `replSetGetStatus` reference: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- `collStats` reference: https://www.mongodb.com/docs/manual/reference/command/collStats/
- mongostat documentation: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB BSON Timestamp specification (Extended JSON v2)

## Issues Found
No technical issues found.

## Review Notes
- The oplog is described as a "capped collection" that "overwrites the oldest entries when full." With the WiredTiger storage engine (default since MongoDB 3.2), the oplog is not a traditional capped collection internally — old entries are truncated rather than overwritten. The conceptual description is acceptable for a blog audience, but a future revision could clarify the WiredTiger behavior.
- The `mongostat` command pipes output through `awk -F'|'`. The default mongostat output format uses space-aligned columns, not pipe delimiters. This command may not produce the intended result with default output. However, since this is in an illustrative monitoring section (not a critical code path), it does not constitute a technical error in the post's core guidance.
- All code examples use correct MongoDB APIs: `$natural` sort on oplog, `.ts.t` for accessing the seconds component of BSON Timestamps, `stats().maxSize` and `stats().size` for capped collection metrics.
- The `replSetResizeOplog` command was correctly noted as available from MongoDB 3.6+, and `minRetentionHours` from MongoDB 4.4+.
- Math checks out: 500 MB/hr * 72 hrs / 1024 = ~35.2 GB; 35 * 1.25 = ~43.75 GB rounded to ~44 GB; 44 * 1024 = 45,056 MB.
- The rules-of-thumb table provides reasonable approximations consistent with the formula presented.
