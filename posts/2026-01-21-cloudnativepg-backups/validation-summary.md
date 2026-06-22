# Validation Summary: How to Set Up PostgreSQL Backups with CloudNativePG

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- CloudNativePG
- Kubernetes custom resources
- PostgreSQL backup and WAL archiving
- Barman Cloud / barmanObjectStore
- Amazon S3 and S3-compatible object storage
- Google Cloud Storage
- Azure Blob Storage
- Kubernetes VolumeSnapshot
- Prometheus alerting

## Sources Consulted
- CloudNativePG 1.29 Recovery documentation: https://cloudnative-pg.io/docs/1.29/recovery/
- CloudNativePG 1.28 VolumeSnapshot backup appendix: https://cloudnative-pg.io/docs/1.28/appendixes/backup_volumesnapshot/
- CloudNativePG 1.27 API reference: https://cloudnative-pg.io/docs/1.27/cloudnative-pg.v1/
- CloudNativePG 1.28 Monitoring documentation: https://cloudnative-pg.io/docs/1.28/monitoring/
- CloudNativePG 1.29 release notes for 1.28: https://cloudnative-pg.io/docs/1.29/release_notes/v1.28/
- CloudNativePG official PostgreSQL image catalog: https://raw.githubusercontent.com/cloudnative-pg/artifacts/refs/heads/main/image-catalogs/catalog-minimal-trixie.yaml
- Barman Cloud API reference: https://pkg.go.dev/github.com/cloudnative-pg/barman-cloud/pkg/api
- Barman Cloud Plugin migration documentation: https://cloudnative-pg.github.io/plugin-barman-cloud/docs/0.8.0/migration/
- PostgreSQL WAL configuration documentation: https://www.postgresql.org/docs/current/runtime-config-wal.html

## Issues Found
- The post presented native `barmanObjectStore` as current built-in backup guidance without noting that CloudNativePG deprecated in-tree Barman Cloud support in 1.26 and plans removal in 1.30. Added a note recommending the Barman Cloud Plugin for new deployments.
- The WAL architecture text described WAL archiving as real-time streaming. Changed it to continuous archiving of completed WAL files, which matches PostgreSQL/Barman behavior.
- The PITR claim said recovery was possible to any moment between backups. Clarified that PITR depends on a base backup plus the archived WAL history from that point onward.
- The IRSA and GKE Workload Identity examples showed annotating a standalone service account. Updated them to use CloudNativePG `serviceAccountTemplate`, which is how cluster instance service account annotations are configured.
- The WAL compression list omitted `xz`, which is supported for WAL compression. Added it.
- The advanced WAL example used `wal.archiveTimeout`, which is not a valid `barmanObjectStore.wal` field. Moved this to PostgreSQL `archive_timeout` under `spec.postgresql.parameters`.
- The ScheduledBackup examples used five-field cron expressions. CloudNativePG `ScheduledBackup.spec.schedule` uses a six-field cron format including seconds, so all schedule examples were updated.
- The "Hourly WAL-based backups" label was inaccurate because `ScheduledBackup` creates base backups, not WAL archives. Changed it to hourly base backups.
- The monitoring section referenced a nonexistent `cnpg_backup_status` metric and an incorrect last-backup-age metric name. Replaced these with CloudNativePG backup and archiver metrics that match documented/exported names.
- The production example had two `backup` keys under one `spec`, which would make the YAML invalid and discard the first backup configuration. Merged `serverName` and the encryption note into the existing `barmanObjectStore` stanza.
- The production example used `data.compression: zstd`, but the Barman Cloud data backup configuration allows `bzip2`, `gzip`, `lz4`, and `snappy`. Changed it to `gzip`.
- The production example set `archive_mode`, which CloudNativePG manages for WAL archiving. Removed that manual parameter.
- The production example pinned the old PostgreSQL image `ghcr.io/cloudnative-pg/postgresql:16.1`. Updated it to the current official PostgreSQL 16 image tag from the CloudNativePG image catalog.

## Review Notes
The post is now technically correct for the legacy native `barmanObjectStore` path, with an explicit deprecation caveat. A future improvement would be a broader rewrite around the Barman Cloud Plugin, but that would require restructuring the guide beyond this validation pass.
