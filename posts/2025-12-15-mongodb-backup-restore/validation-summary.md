# Validation Summary: How to Backup and Restore MongoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB
- MongoDB Database Tools (`mongodump`, `mongorestore`)
- MongoDB replica set oplog
- MongoDB filesystem snapshots and `fsyncLock`
- AWS CLI EBS snapshots
- Google Cloud CLI disk snapshots
- Azure CLI managed disk snapshots
- Node.js backup verification snippets

## Sources Consulted
- MongoDB Database Tools: `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools: `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Manual: Backup Methods for a Self-Managed Deployment: https://www.mongodb.com/docs/manual/core/backups/
- MongoDB Manual: Back Up a Self-Managed Deployment with Filesystem Snapshots: https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/
- MongoDB Manual: `fsync` command: https://www.mongodb.com/docs/manual/reference/command/fsync/
- MongoDB Manual: Extended JSON v2: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- MongoDB Shell data types: `Timestamp`: https://www.mongodb.com/docs/mongodb-shell/reference/data-types/
- MongoDB Node.js Driver: counting documents: https://www.mongodb.com/docs/drivers/node/current/crud/query/count/
- AWS CLI `ec2 create-snapshot`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- Google Cloud CLI `gcloud compute disks snapshot`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/disks/snapshot
- Azure CLI `az snapshot create`: https://learn.microsoft.com/en-us/cli/azure/snapshot

## Issues Found
- Replaced `mongorestore --db mydb /backup/mydb_backup/mydb` with `mongorestore --nsInclude "mydb.*" /backup/mydb_backup` because current `mongorestore` documentation marks `--db` and `--collection` as deprecated when restoring from a directory or archive.
- Replaced the "restore to different database" example using `--db newdb` against a directory with `--nsFrom "mydb.*" --nsTo "newdb.*"`, which is the current namespace remapping mechanism for directory restores.
- Clarified the `mongodump --oplog` comment. The option includes oplog entries written during the dump for a consistent replica set backup; it does not by itself create a continuous point-in-time recovery stream.
- Fixed the continuous oplog backup script. The original stored only `doc.ts.getTime()` and built an invalid Extended JSON timestamp with only `t`; BSON Timestamp Extended JSON requires both `t` and `i`. The script now stores `EJSON.stringify(doc.ts)` and reuses that full timestamp in the next query.
- Fixed the JavaScript backup verification snippet. The original mixed shell-style `db.getSiblingDB()` with Node.js `exec`, omitted imports, and did not await `countDocuments()`. The snippet now uses Node.js `execFile`, namespace remapping, and the MongoDB Node.js driver client API.

## Review Notes
MongoDB Database Tools were not installed in the local environment, so command validation was performed against the current official MongoDB Database Tools documentation. The post is technically relevant and contains implementation details. Some examples remain intentionally illustrative and require deployment-specific values, credentials, roles, storage layout, and backup retention policies before production use.
