# Validation Summary: How to Configure PostgreSQL Backup and Restore with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudNativePG
- Barman Cloud CNPG-I Plugin
- Kubernetes CRDs, Secrets, RBAC, and CronJobs
- Flux CD / GitOps
- PostgreSQL physical backup, WAL archiving, and PITR
- S3-compatible and cloud object storage

## Sources Consulted
- CloudNativePG Backup documentation: https://cloudnative-pg.io/docs/1.29/backup
- CloudNativePG Recovery documentation: https://cloudnative-pg.io/docs/1.29/recovery
- Barman Cloud CNPG-I Plugin usage documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/
- Barman Cloud CNPG-I Plugin object store provider documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/object_stores/
- Barman Cloud CNPG-I Plugin retention policy documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/retention/
- Barman Cloud CNPG-I Plugin migration documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/migration/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- CloudNativePG was incorrectly described as a pgBackRest-based operator. Updated the text and tags to describe CloudNativePG's Barman Cloud path while still acknowledging pgBackRest-based operators such as PGO and Percona.
- The original CloudNativePG examples used the deprecated in-tree `barmanObjectStore` configuration. Updated the examples to use the Barman Cloud CNPG-I Plugin, including an `ObjectStore`, `spec.plugins`, `method: plugin`, and `pluginConfiguration`.
- The scheduled backup examples used five-field cron expressions, but CloudNativePG `ScheduledBackup` uses a six-field cron format that includes seconds. Updated the daily and weekly schedules.
- The manual backup example created a timestamped backup name but then queried a different hard-coded name. Updated it to use a `BACKUP_NAME` variable consistently.
- The PITR restore example mixed `backup.name`, `source`, and `recoveryTarget` in a way that did not match the documented object-store recovery flow. Updated it to restore from the plugin-backed external cluster source with an explicit `recoveryTarget.targetTime`.
- The restore-testing CronJob attempted to run `pgbackrest` from a CloudNativePG PostgreSQL image, which does not match the Barman Cloud Plugin configuration. Replaced it with a CronJob that creates a temporary recovery cluster, waits for readiness, and cleans it up, including the required namespace RBAC.
- The retention policy was initially placed under the backup configuration block. Updated it to the plugin `ObjectStore` `spec.retentionPolicy` field.
- GCS was described as S3-compatible. Updated the prerequisites to describe Barman Cloud-supported object stores more generally.

## Review Notes
- The post now follows the current CloudNativePG recommendation to use the Barman Cloud CNPG-I Plugin instead of the deprecated in-tree Barman Cloud integration.
- The restore-test CronJob is suitable as a validation pattern, but production use should also account for storage class, resource limits, namespace isolation, and cleanup of PVCs created by the temporary cluster.
