# Validation Summary: How to Configure the storage Section in mongod.conf

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (mongod.conf configuration)
- WiredTiger storage engine
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: storage configuration options — https://www.mongodb.com/docs/manual/reference/configuration-options/#storage-options
- MongoDB Manual: WiredTiger storage engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: journaling — https://www.mongodb.com/docs/manual/core/journaling/
- MongoDB Manual: db.serverStatus() — https://www.mongodb.com/docs/manual/reference/method/db.serverStatus/
- MongoDB Manual: getCmdLineOpts — https://www.mongodb.com/docs/manual/reference/command/getCmdLineOpts/

## Issues Found
No technical issues found.

## Review Notes
- In MongoDB 4.0+, journaling cannot be disabled for WiredTiger replica set members. In MongoDB 6.1+, `storage.journal.enabled` was removed entirely (journaling is always on). The post's advice to "keep journaling enabled in production" is correct but readers on modern MongoDB should know the option is either redundant or removed.
- The `commitIntervalMs` default of 100ms applies to replica set members; standalone instances default to 30ms. The post does not distinguish between the two, which is acceptable for a general guide.
- Since MongoDB 4.2+, WiredTiger is the only supported storage engine, so `engine: wiredTiger` is redundant but not incorrect.
- The WiredTiger cache formula stated as "half of available RAM minus 1 GB" is correct. The full formula is `max(50% of (RAM - 1 GB), 256 MB)` — the 256 MB floor is not mentioned but is a minor omission.
- The `syncPeriodSecs` description is correct but MongoDB documentation advises against changing this value in production since WiredTiger uses its own checkpoint mechanism.
