# Validation Summary: How to Calculate Recovery Point Objective (RPO) for MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, sharded clusters, standalone)
- MongoDB Aggregation Framework (`$setWindowFields`, `$shift`)
- MongoDB oplog (`oplog.rs` in `local` database)
- MongoDB Atlas Continuous Backup (PITR)
- mongosh CLI
- Percona Backup for MongoDB (PBM)
- Python

## Sources Consulted
- MongoDB documentation on `$setWindowFields`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB documentation on `$shift`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/
- MongoDB documentation on `replSetResizeOplog`: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB documentation on the oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB Atlas documentation on continuous backup and PITR: https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/
- Percona Backup for MongoDB documentation: https://docs.percona.com/percona-backup-mongodb/

## Issues Found
No technical issues found.

## Review Notes
- The `$setWindowFields` aggregation stage requires MongoDB 5.0+. The post does not mention this version requirement, which could be noted for readers on older versions.
- The Atlas PITR "1 second" RPO claim is commonly cited but in practice depends on oplog granularity and the timing of the last oplog entry captured. This is a minor nuance that does not constitute an error.
- The post correctly distinguishes between RPO as a target vs. actual RPO exposure, which is a common source of confusion.
