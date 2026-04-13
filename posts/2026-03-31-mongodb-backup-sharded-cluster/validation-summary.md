# Validation Summary: How to Back Up a Sharded MongoDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (sharded cluster architecture)
- mongodump / mongorestore (MongoDB Database Tools)
- mongosh (MongoDB Shell)
- Filesystem snapshots (LVM, cloud volume snapshots)
- db.fsyncLock() / db.fsyncUnlock()
- Balancer management (sh.stopBalancer, sh.startBalancer)

## Sources Consulted
- MongoDB Manual: Back Up a Sharded Cluster — https://www.mongodb.com/docs/manual/tutorial/backup-sharded-cluster-with-database-dumps/
- MongoDB Manual: mongodump reference — https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Manual: mongorestore reference — https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Manual: sh.stopBalancer() — https://www.mongodb.com/docs/manual/reference/method/sh.stopBalancer/
- MongoDB Manual: sh.startBalancer() — https://www.mongodb.com/docs/manual/reference/method/sh.startBalancer/
- MongoDB Manual: sh.getBalancerState() — https://www.mongodb.com/docs/manual/reference/method/sh.getBalancerState/
- MongoDB Manual: db.fsyncLock() — https://www.mongodb.com/docs/manual/reference/method/db.fsyncLock/
- MongoDB Manual: mongodump --readPreference — https://www.mongodb.com/docs/database-tools/mongodump/#std-option-mongodump.--readPreference

## Issues Found
1. **Missing `--readPreference` flag on shard backup commands**: The post stated "Connect to a secondary to avoid impacting the primary" but the `mongodump` commands used replica set connection strings without specifying `--readPreference`. By default, `mongodump` with a replica set URI reads from the primary, contradicting the stated intent. Added `--readPreference secondaryPreferred` to all shard backup `mongodump` commands (both the standalone examples and the automation script).

## Review Notes
- The `sh.stopBalancer()` method in modern MongoDB (4.2+) blocks until in-progress migrations complete (with a default timeout of 60 seconds). The interactive example's explicit polling loop with `sh.isBalancerRunning()` is redundant but harmless as a defensive pattern and is fine for a tutorial.
- The config server backup only captures the `config` database. In a production scenario, backing up the `admin` database (which contains user/role definitions) would also be advisable, but the post's focus on sharding metadata is reasonable for scope.
- The `mongorestore` verification section uses `$(date +%F)` which would only work if restore happens on the same day as backup. This is acceptable for illustration purposes.
- Port conventions used (27019 for config servers, 27018 for shards) are common conventions but not MongoDB defaults; the default mongod port is 27017. This is fine since sharded cluster deployments commonly use these ports to differentiate components.
