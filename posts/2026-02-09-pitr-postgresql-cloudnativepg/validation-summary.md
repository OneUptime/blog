# Validation Summary: How to Use Point-in-Time Recovery for PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- PostgreSQL
- CloudNativePG
- Barman Cloud object-store backup and WAL archiving
- AWS S3-compatible object storage
- Prometheus Operator alerts

## Sources Consulted
- CloudNativePG 1.21 backup documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/docs/src/backup.md
- CloudNativePG 1.21 object-store backup documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/docs/src/backup_barmanobjectstore.md
- CloudNativePG 1.21 recovery documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/docs/src/recovery.md
- CloudNativePG 1.21 WAL archiving documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/docs/src/wal_archiving.md
- CloudNativePG 1.21 PostgreSQL configuration documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/docs/src/postgresql_conf.md
- CloudNativePG 1.21 labels and annotations documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/docs/src/labels_annotations.md
- CloudNativePG 1.21 CRD release manifest: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/releases/cnpg-1.21.0.yaml
- CloudNativePG 1.21.6 release manifest URL: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/releases/cnpg-1.21.6.yaml
- CloudNativePG monitoring documentation: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/docs/src/monitoring.md
- Kubernetes container image registry documentation: https://kubernetes.io/releases/download/
- CloudNativePG supported releases documentation: https://cloudnative-pg.io/docs/1.25/supported_releases/
- PostgreSQL continuous archiving and PITR documentation: https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL recovery target settings documentation: https://www.postgresql.org/docs/current/runtime-config-wal.html#RUNTIME-CONFIG-WAL-RECOVERY-TARGET

## Issues Found
- The operator install command used CloudNativePG 1.21.0. Updated it to the final 1.21 patch release, 1.21.6.
- The `Cluster` example attempted to define scheduled backups under `spec.backup.schedule`, which is not part of the CloudNativePG 1.21 `Cluster` schema. Moved schedules into separate `ScheduledBackup` resources and changed the cron expressions to CloudNativePG's six-field format.
- The PostgreSQL parameters included `archive_mode`, which CloudNativePG manages as a fixed parameter and rejects in user configuration. Removed it from the cluster manifest.
- The primary pod selector used the deprecated `role=primary` label. Updated it to `cnpg.io/instanceRole=primary`.
- The PITR recovery example combined `bootstrap.recovery.source` with `bootstrap.recovery.backup`, which are mutually exclusive. Kept the object-store recovery flow and used `recoveryTarget.backupID` for pinning a base backup.
- The PITR timestamp was not in the RFC3339 format described by CloudNativePG recovery docs. Updated it to `2026-02-09T14:30:00Z`.
- The named restore point recovery snippet omitted `backupID`; CloudNativePG cannot automatically choose the right base backup for `targetName` the same way it can for `targetTime` or `targetLSN`. Added `backupID`.
- The backup verification CronJob lacked the RBAC objects required by its service account. Added a `ServiceAccount`, `Role`, and `RoleBinding`.
- The backup verification recovery example also combined mutually exclusive recovery fields. Changed it to restore from the selected `Backup` object only.
- The backup verification cleanup deleted clusters labeled `verification=true`, but the generated cluster did not have that label. Added the label to the generated cluster metadata.
- The Prometheus alert examples used metrics that are not part of CloudNativePG 1.21's documented default metrics. Replaced them with `cnpg_collector_last_failed_backup_timestamp` and `cnpg_collector_last_available_backup_timestamp`.
- The large-database tuning example used `zstd` WAL compression and `archiveTimeout`, neither of which exists in the CloudNativePG 1.21 WAL backup schema. Replaced `zstd` with `bzip2` and removed `archiveTimeout`.

## Review Notes
CloudNativePG 1.21 reached end of life on June 12, 2024. The corrected examples are valid for the 1.21 API used by the post, but a future update should move the article to a currently supported CloudNativePG release and account for newer backup plugin guidance.
