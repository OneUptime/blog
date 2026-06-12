# Validation Summary: How to Configure Velero Backup Hooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero backup hooks
- Velero restore hooks
- Kubernetes Pods, Deployments, Backup, Restore, and Schedule resources
- PostgreSQL 15
- MySQL 8.0
- Redis
- kubectl and velero CLI commands

## Sources Consulted
- Velero Backup Hooks documentation: https://velero.io/docs/main/backup-hooks/
- Velero Backup API Type documentation: https://velero.io/docs/main/api-types/backup/
- Velero Restore Hooks documentation: https://velero.io/docs/main/restore-hooks/
- Velero Restore API Type documentation: https://velero.io/docs/main/api-types/restore/
- Velero File System Backup documentation: https://velero.io/docs/main/file-system-backup/
- PostgreSQL 15 Backup Control Functions: https://www.postgresql.org/docs/15/functions-admin.html
- PostgreSQL 15 Release Notes: https://www.postgresql.org/docs/15/release-15.html
- MySQL 8.0/8.4 FLUSH Statement documentation: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 LOCK INSTANCE FOR BACKUP documentation: https://dev.mysql.com/doc/refman/8.0/en/lock-instance-for-backup.html

## Issues Found
- PostgreSQL examples used `pg_start_backup()` and `pg_stop_backup()` with the `postgres:15` image. PostgreSQL 15 renamed these functions to `pg_backup_start()` and `pg_backup_stop()`, and the low-level backup API is not appropriate for separate Velero pre/post exec sessions because required backup metadata is returned by the stop call. Replaced those examples with `CHECKPOINT;` commands and adjusted surrounding text so it no longer claims the hook starts or stops PostgreSQL backup mode.
- MySQL examples used `FLUSH TABLES WITH READ LOCK` in a one-shot `mysql -e` command and then attempted to unlock in a separate post hook. That lock is session-scoped, so it would be released when the pre-hook client exits and would not be held during the Velero backup. Replaced the example with `FLUSH TABLES;` and changed the post hook to a completion message.
- The multi-container annotation example repeated the same `pre.hook.backup.velero.io/container`, `pre.hook.backup.velero.io/command`, and `pre.hook.backup.velero.io/timeout` annotation keys. Kubernetes annotations are a map, so duplicate keys would be overwritten and only one pre-hook would survive. Reworked that example to use Backup spec hooks, which Velero supports for multiple ordered hooks.
- The basic pod example stopped and restarted PostgreSQL with `pg_ctl` from hooks. In Kubernetes, stopping the container's main database process can terminate/restart the container before the post hook can run. Replaced it with a generic application write-pause flag example.
- Several descriptions overstated what these database hook snippets guarantee. Updated the wording to say hooks can prepare applications and that database consistency requires database-native backup tooling or stopping writes for the backup duration.

## Review Notes
The Velero annotation names, Backup spec hook fields, Restore spec `postHooks`, `execTimeout`, `waitTimeout`, and `defaultVolumesToFsBackup` field were verified against current Velero documentation. YAML snippets were parsed successfully after the edits. The database snippets are now syntactically valid and avoid removed APIs, but production-grade database backups should still use database-specific backup tools and restore testing.
