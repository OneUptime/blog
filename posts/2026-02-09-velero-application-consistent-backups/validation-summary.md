# Validation Summary: How to Implement Application-Consistent Backups with Velero Pre-Backup Hooks

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Velero backup hooks and Backup API resources
- Kubernetes StatefulSets, ConfigMaps, annotations, and kubectl
- PostgreSQL 15 backup/checkpoint functions
- MySQL 8.0 table flush and global read locks
- MongoDB 7 fsync lock/unlock operations
- PrometheusRule alerts for Velero backup monitoring

## Sources Consulted
- Velero Backup Hooks documentation: https://velero.io/docs/v1.18/backup-hooks/
- Velero Backup API Type documentation: https://velero.io/docs/main/api-types/backup/
- PostgreSQL 15 System Administration Functions: https://www.postgresql.org/docs/15/functions-admin.html
- PostgreSQL 15 Release Notes: https://www.postgresql.org/docs/15/release-15.html
- PostgreSQL Continuous Archiving and PITR documentation: https://www.postgresql.org/docs/16/continuous-archiving.html
- MySQL FLUSH statement documentation: https://dev.mysql.com/doc/refman/8.4/en/flush.html
- MongoDB db.fsyncUnlock() documentation: https://www.mongodb.com/docs/manual/reference/method/db.fsyncunlock/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Velero metrics package reference: https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/metrics

## Issues Found
- PostgreSQL examples used `pg_start_backup()`, `pg_stop_backup()`, and `pg_is_in_backup()` with `postgres:15`. PostgreSQL 15 removed/renamed these functions and removed exclusive backup mode. Updated PostgreSQL hook examples to use `CHECKPOINT` and `pg_switch_wal()` as a hook-safe flush step, and added a caveat to use PostgreSQL-native tooling such as `pg_basebackup` or pgBackRest for full physical base backups.
- MySQL examples ran `FLUSH TABLES WITH READ LOCK` in a short-lived `mysql -e` session. That releases the global read lock when the client exits, before Velero can snapshot the volume. Updated the hooks to keep a detached MySQL client session alive with `DO SLEEP(86400)` and release the lock by killing that session from the post hook.
- Testing commands used `deployment/postgres`, but the examples define PostgreSQL as a StatefulSet. Updated the `kubectl exec` targets to `statefulset/postgres`.
- The Prometheus alert was named and described as a hook-specific alert while using a general Velero backup failure metric. Updated the alert name and description to indicate general backup failures that should be inspected for hook errors.
- The conclusion claimed guaranteed data integrity. Softened the wording because successful recovery still depends on storage snapshot behavior, application semantics, hook success, WAL/archive handling, and restore testing.

## Review Notes
Velero hook annotations and Backup spec hook fields are accurate, including `pre.hook.backup.velero.io/*`, `post.hook.backup.velero.io/*`, `onError`, and `timeout`. MongoDB `db.fsyncLock()`/`db.fsyncUnlock()` usage is valid for self-managed MongoDB, but MongoDB documents that these commands are not supported in Atlas clusters.
