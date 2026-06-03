# Validation Summary: How to Configure Velero Backup Hooks for Pre and Post Backup Command Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero backup hooks
- Kubernetes Deployments, StatefulSets, Pods, annotations, ConfigMaps, and PersistentVolumeClaims
- MySQL
- PostgreSQL
- Redis
- Prometheus alert rules
- kubectl and Velero CLI commands

## Sources Consulted
- Velero Backup Hooks documentation: https://velero.io/docs/v1.18/backup-hooks/
- Velero Backup API Type documentation: https://velero.io/docs/v1.18/api-types/backup/
- Velero Resource Filtering documentation: https://velero.io/docs/main/resource-filtering/
- Velero Troubleshooting metrics documentation: https://velero.io/docs/v1.18/troubleshooting/
- PostgreSQL 15 Backup Control Functions documentation: https://www.postgresql.org/docs/15/functions-admin.html
- PostgreSQL 15 pg_dumpall documentation: https://www.postgresql.org/docs/15/app-pg-dumpall.html
- PostgreSQL 15 release notes: https://www.postgresql.org/docs/15/release-15.html
- Redis BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis LASTSAVE command documentation: https://redis.io/docs/latest/commands/lastsave/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- Corrected the description of Velero hook timing. Velero runs backup hooks when a pod is being backed up, with post hooks after custom action processing and additional items for that pod or item block, not simply after the whole backup completes.
- Replaced the MySQL `FLUSH TABLES WITH READ LOCK` / `UNLOCK TABLES` annotation example. The lock is connection-scoped and would be released when the `mysql -e` session exits, so the post-hook unlock example was misleading.
- Added `includedResources: pods` to backup-spec hook examples because Velero documents pods as the supported resource for backup exec hooks.
- Replaced invalid multi-container annotation keys such as `pre.hook.backup.velero.io/command-sidecar` with multiple backup-spec hook definitions targeting different containers.
- Replaced PostgreSQL 15 examples using `pg_start_backup()` and `pg_stop_backup()`. PostgreSQL 15 renamed these functions to `pg_backup_start()` and `pg_backup_stop()`, and the returned backup label handling made the original hook pattern incorrect for the shown use case. The examples now use `pg_dumpall` and compression.
- Fixed the reusable PostgreSQL hook scripts to write and compress a logical dump under `/backup`, and added the corresponding volume mount.
- Fixed the Redis `LASTSAVE` loop so it captures the previous save timestamp before `BGSAVE` and waits until `LASTSAVE` changes.
- Updated the hook monitoring command to grep the documented `HooksAttempted` and `HooksFailed` fields shown by `velero backup describe`.
- Reworded the "parallel hook execution" example because the referenced Velero backup documentation does not state that backup hooks for different resources are executed in parallel.
- Added missing StatefulSet selector, template labels, and service names to abbreviated StatefulSet examples so the YAML is valid Kubernetes resource structure.

## Review Notes
The YAML snippets parse successfully. The Velero CLI was not installed in the local environment, so CLI command verification was performed against official Velero documentation rather than local `--help` output.
