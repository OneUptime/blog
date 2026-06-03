# Validation Summary: How to Use Volume Snapshots for Database Backup Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs and CronJobs
- Kubernetes CSI VolumeSnapshots
- PostgreSQL 15 backup functions
- MySQL 8.0 backup locking and binary log position capture
- MongoDB 7.0 fsync lock workflow
- Redis 7.0 RDB snapshots and BGSAVE
- Bash shell scripting

## Sources Consulted
- Kubernetes CSI VolumeSnapshot API documentation: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- PostgreSQL 16 official backup documentation for `pg_backup_start` and `pg_backup_stop`: https://www.postgresql.org/docs/16/continuous-archiving.html
- MySQL official FLUSH statement documentation: https://dev.mysql.com/doc/refman/en/flush.html
- MySQL official binary log status documentation: https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.0 official SHOW statements documentation: https://dev.mysql.com/doc/refman/8.0/en/show.html
- MongoDB 7.0 official fsync command documentation: https://www.mongodb.com/docs/v7.0/reference/command/fsync/
- Redis official BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/

## Issues Found
- The PostgreSQL examples used `pg_start_backup()` and `pg_stop_backup()` with the `postgres:15` image. PostgreSQL 15 uses `pg_backup_start()` and `pg_backup_stop()`, so the examples were updated to the current function names.
- The PostgreSQL examples started and stopped backup mode using separate `psql -c` invocations. Official PostgreSQL documentation requires the connection that starts backup mode to remain open until backup mode is stopped, so the examples now run snapshot creation through `psql` shell escapes while keeping the same database connection open.
- The MySQL example ran `FLUSH TABLES WITH READ LOCK` in a short-lived `mysql -e` session. That releases the global read lock when the client exits, before the snapshot is created. The example now keeps the MySQL session open through snapshot creation and releases it afterward.
- The MySQL binary log metadata parsing expected `SHOW MASTER STATUS\G` output from a separate command. Because the corrected lock workflow uses a persistent batch session, the parsing was updated to read file and position columns from the same locked session output.
- The Redis example compared `LASTSAVE` to a fresh `LASTSAVE` call in the same loop condition, which could loop indefinitely. It now stores the pre-`BGSAVE` timestamp and waits until `LASTSAVE` changes.
- The multi-database snapshot example used `jq` without installing it in the `bitnami/kubectl` container. The ready count now uses `kubectl` JSONPath plus standard shell utilities.

## Review Notes
- `SHOW MASTER STATUS` remains valid for the `mysql:8.0` image used in the post, but newer MySQL 8.4 documentation uses `SHOW BINARY LOG STATUS`.
- The multi-database example creates related snapshots with a common batch label. It does not provide an atomic cross-volume group snapshot.
