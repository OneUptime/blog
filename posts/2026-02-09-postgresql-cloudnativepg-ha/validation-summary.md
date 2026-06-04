# Validation Summary: How to Deploy PostgreSQL Using CloudNativePG Operator for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Kubernetes
- CloudNativePG Operator
- CloudNativePG Barman Cloud Plugin
- PgBouncer
- Prometheus Operator
- AWS S3 object storage

## Sources Consulted
- CloudNativePG 1.29 Installation and upgrades: https://cloudnative-pg.io/docs/1.29/installation_upgrade/
- CloudNativePG 1.29 Backup: https://cloudnative-pg.io/docs/1.29/backup/
- CloudNativePG Monitoring: https://cloudnative-pg.io/documentation/1.24/monitoring/
- CloudNativePG Connection Pooling: https://cloudnative-pg.io/docs/devel/connection_pooling/
- CloudNativePG Service Management: https://cloudnative-pg.io/docs/1.28/service_management/
- CloudNativePG API Reference: https://cloudnative-pg.io/docs/devel/cloudnative-pg.v1/
- CloudNativePG Image Catalog: https://cloudnative-pg.io/docs/1.29/image_catalog/
- Barman Cloud CNPG-I Plugin Installation: https://cloudnative-pg.io/plugin-barman-cloud/docs/installation/
- Barman Cloud CNPG-I Plugin Usage: https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/
- Barman Cloud CNPG-I Plugin Retention Policies: https://cloudnative-pg.io/plugin-barman-cloud/docs/retention/

## Issues Found
- The direct operator manifest used CloudNativePG 1.22.0, which is outdated. Updated it to the current 1.29.1 manifest and used the documented `kubectl rollout status` verification command.
- The `database` namespace was referenced before being created. Added `kubectl create namespace database` before creating the credentials secret.
- The replication-status command queried a fixed pod name that might not be the primary. Updated it to read `.status.currentPrimary` first and execute `pg_stat_replication` on that pod.
- The scheduled backup used a five-field cron expression. CloudNativePG `ScheduledBackup.spec.schedule` uses a six-field cron expression including seconds, so it was changed to `0 0 2 * * *`.
- Backup examples used the deprecated in-core `backup.barmanObjectStore` configuration. Replaced them with the Barman Cloud plugin, `ObjectStore`, `Cluster.spec.plugins`, `ScheduledBackup.method: plugin`, and plugin-based recovery configuration.
- The PgBouncer example incorrectly placed `pooler` under `Cluster.spec`. CloudNativePG uses a separate `Pooler` CRD, so the snippet was rewritten as a `Pooler` resource.
- The Prometheus example used `ServiceMonitor`, but CloudNativePG documents `PodMonitor` for cluster metrics. Replaced the resource with `PodMonitor`.
- The alert examples used non-existent or unreliable metric names/labels. Updated them to use CloudNativePG default metric names such as `cnpg_pg_replication_lag`, `cnpg_backends_total`, and `cnpg_pg_settings_setting`.
- The read-replica service example redefined the reserved default `postgres-ha-ro` service and manually set a selector that CloudNativePG manages. Updated it to use `selectorType: ro`, removed the manual selector, and used a non-reserved service name.
- The rolling-update example used an old PostgreSQL 16.1 image. Updated it to the current official PostgreSQL 16 image shown in CloudNativePG's image catalog.
- The production example used deprecated backup and monitoring fields. Replaced the backup stanza with plugin configuration and removed the deprecated `monitoring.enablePodMonitor` field.

## Review Notes
The backup examples now target current CloudNativePG plugin-based object-store backups. The Barman Cloud plugin requires cert-manager, which is noted in the post but not expanded into a cert-manager installation walkthrough.
