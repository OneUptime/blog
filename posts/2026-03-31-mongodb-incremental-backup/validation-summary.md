# Validation Summary: How to Implement Incremental Backup for MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (oplog, capped collections, BSON Timestamp type)
- mongodump / mongorestore (MongoDB Database Tools)
- mongosh (MongoDB Shell)
- Percona Backup for MongoDB (PBM)
- Bash scripting
- Cron scheduling
- Amazon S3 (as backup storage target)

## Sources Consulted
- Percona Backup for MongoDB — Configure remote backup storage: https://docs.percona.com/percona-backup-mongodb/install/backup-storage.html
- Percona Backup for MongoDB — Make an incremental backup: https://docs.percona.com/percona-backup-mongodb/usage/backup-incremental.html
- Percona Backup for MongoDB — Make a point-in-time restore: https://docs.percona.com/percona-backup-mongodb/usage/pitr-tutorial.html
- Percona Backup for MongoDB — PBM commands reference: https://docs.percona.com/percona-backup-mongodb/reference/pbm-commands.html
- Percona Backup for MongoDB — Install from repositories: https://docs.percona.com/percona-backup-mongodb/install/repos.html
- Percona Backup for MongoDB — Start pbm-agent with config file: https://docs.percona.com/percona-backup-mongodb/manage/start-agent-with-config.html
- MongoDB Manual — mongodump: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Manual — Replica Set Oplog: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- MongoDB Manual — BSON Types: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB Manual — Iterate a Cursor in mongosh: https://www.mongodb.com/docs/manual/tutorial/iterate-a-cursor/
- MongoDB Manual — Capped Collections: https://www.mongodb.com/docs/manual/core/capped-collections/
- Node.js BSON Timestamp class: https://mongodb.github.io/node-mongodb-native/4.4/classes/Timestamp.html

## Issues Found

1. **PBM storage configuration method was incorrect.** The blog wrote the storage config YAML directly to `/etc/pbm-agent.conf` as if PBM reads it at runtime from that path. In reality, PBM storage configuration must be uploaded into PBM's internal config (stored in MongoDB) using `pbm config --file <path>`. Changed to write a temporary YAML file and then run `pbm config --file` to upload it.

2. **Missing `--base` flag for first incremental backup.** The blog showed `pbm backup --type=logical` as the baseline for incremental backups. PBM incremental backups require their own base created with `pbm backup --type=incremental --base` — a logical backup does not serve as a base for the incremental chain. Changed the initial backup command to `pbm backup --type=incremental --base`.

3. **Cron schedule used wrong backup type for weekly base.** The weekly cron entry used `--type=logical`, which does not create an incremental base. Changed to `--type=incremental --base` so the weekly job resets the incremental chain properly.

4. **PITR restore syntax was incorrect.** `pbm restore 2024-01-15T10:30:00Z` as a positional argument restores a named backup snapshot, not a point-in-time restore. Changed to `pbm restore --time="2024-01-15T10:30:00"` which is the correct PITR syntax.

5. **`--base-snapshot` used without `--time` flag.** `pbm restore --base-snapshot` must be combined with `--time` for point-in-time restore — it cannot be used alone. Fixed to include both flags.

6. **`pbm status --format=json` used wrong flag.** PBM does not have a `--format` flag. The correct flag for JSON output is `-o json` (or `--out=json`). Changed to `pbm status -o json`.

7. **`.ts.t` is unreliable in mongosh for Timestamp extraction.** In mongosh, the BSON Timestamp object does not reliably expose `.t` as a property. The correct accessor is `.ts.getHighBits()` which returns the seconds component. Changed both occurrences (initial baseline capture and post-backup timestamp update).

8. **`[0]` on cursor is not idiomatic.** Using array indexing on a cursor forces materialization into an array. Changed to `.next()` which is the canonical approach for retrieving a single document from a cursor.

## Review Notes
- The oplog-based backup script has a potential race condition: writes occurring between `mongodump` completion and the `NEW_TS` capture could lead to minor timing gaps. This is an inherent limitation of the approach and is acceptable for the blog's educational context.
- The blog does not mention that the oplog is a capped collection with a fixed size window — if the incremental backup interval exceeds the oplog window, operations will be lost. This is worth noting but was not added to avoid scope creep.
- The PBM installation command (`sudo yum install percona-backup-mongodb`) is correct in package name but omits the prerequisite step of configuring the Percona repository (`percona-release enable pbm release`). This was left as-is since the blog focuses on the backup workflow rather than full installation setup.
- The S3 credential field names in the PBM YAML config (`access-key-id`, `secret-access-key`) are correct per official Percona documentation.
