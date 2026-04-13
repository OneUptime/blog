# Validation Summary: How to Back Up a Sharded Cluster in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharded clusters)
- mongodump / mongorestore (MongoDB Database Tools)
- mongosh (MongoDB Shell)
- Bash scripting for backup automation

## Sources Consulted
- MongoDB Manual: Back Up a Sharded Cluster with Database Dumps (https://www.mongodb.com/docs/manual/tutorial/backup-sharded-cluster-with-database-dumps/)
- MongoDB Manual: sh.stopBalancer() (https://www.mongodb.com/docs/manual/reference/method/sh.stopBalancer/)
- MongoDB Manual: sh.isBalancerRunning() (https://www.mongodb.com/docs/manual/reference/method/sh.isBalancerRunning/)
- MongoDB Database Tools: mongodump (https://www.mongodb.com/docs/database-tools/mongodump/)
- MongoDB Database Tools: mongorestore --dryRun (https://www.mongodb.com/docs/database-tools/mongorestore/)

## Issues Found

1. **Outdated migration check using `config.locks` collection**: The post used `db.locks.findOne({ _id: "balancer" })` to check for active migrations. In MongoDB 4.4+, the distributed locking mechanism for the balancer changed, making the `config.locks` collection unreliable for this purpose. Replaced with a `while (sh.isBalancerRunning())` loop, which is the correct and version-agnostic approach.

2. **Non-existent `mongodump --dryRun` flag**: The verification section used `mongodump --dryRun`, but `mongodump` does not have a `--dryRun` option. Only `mongorestore` supports `--dryRun` (since MongoDB Database Tools 100.0). Replaced with `mongorestore --dryRun --dir <path>` which correctly validates that backup files can be read and restored.

## Review Notes
- The config server `mongodump` command specifies the database in both the URI path (`/config`) and via `--db config`. While this works in most versions, newer MongoDB Database Tools (100.x) may warn about redundancy. Not changed since it still functions correctly.
- Credentials are shown in plaintext in connection URIs. In production, environment variables or a credentials file should be used. This is acceptable for a tutorial.
- The automation script does not include error handling (e.g., checking mongodump exit codes, handling balancer stop failures). Acceptable for a tutorial but worth noting for production use.
- The post does not specify which MongoDB versions it targets. The corrected content is compatible with MongoDB 4.4+.
