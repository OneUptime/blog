# Validation Summary: How to Deploy PostgreSQL on Kubernetes with CloudNativePG

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Kubernetes
- CloudNativePG
- CloudNativePG Barman Cloud plugin
- PgBouncer
- Prometheus Operator
- Helm
- kubectl
- S3, Google Cloud Storage, and Azure Blob Storage

## Sources Consulted
- CloudNativePG installation and upgrades documentation: https://cloudnative-pg.io/docs/1.29/installation_upgrade/
- CloudNativePG API reference: https://cloudnative-pg.io/docs/1.27/cloudnative-pg.v1/
- CloudNativePG backup documentation: https://cloudnative-pg.io/docs/1.29/backup/
- CloudNativePG monitoring documentation: https://cloudnative-pg.io/docs/1.29/monitoring/
- CloudNativePG connection pooling documentation: https://cloudnative-pg.io/docs/1.29/connection_pooling/
- CloudNativePG service management documentation: https://cloudnative-pg.github.io/docs/devel/service_management/
- CloudNativePG labels and annotations documentation: https://cloudnative-pg.github.io/docs/1.28/labels_annotations/
- Barman Cloud CNPG-I plugin concepts: https://cloudnative-pg.io/plugin-barman-cloud/docs/concepts/
- Barman Cloud CNPG-I plugin usage documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/
- Barman Cloud CNPG-I plugin object store provider documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/object_stores/
- PostgreSQL versioning policy: https://www.postgresql.org/support/versioning/
- PostgreSQL 16.9 release notes and current release information checked via PostgreSQL official release pages: https://www.postgresql.org/docs/release/

## Issues Found
- The kubectl install command claimed to install the latest operator but used the old CloudNativePG 1.22.0 manifest. Updated it to the current 1.29 patch manifest command shown in the official docs and changed verification to `kubectl rollout status`.
- The production example used the outdated PostgreSQL image `16.1`. Updated the example to `16.14`, matching the current supported minor-release guidance for PostgreSQL 16.
- Backup examples used the deprecated in-tree `backup.barmanObjectStore` configuration. Reworked them to use the current Barman Cloud plugin model with `spec.plugins` on the `Cluster` and separate `barmancloud.cnpg.io/v1` `ObjectStore` resources.
- S3 secret key naming was inconsistent with current Barman Cloud plugin examples. Updated the secret key to `ACCESS_SECRET_KEY`.
- The scheduled backup cron expression used a five-field Unix cron format. CloudNativePG `ScheduledBackup` uses six fields with seconds, so it was changed to `0 0 0 * * *`.
- The `Backup` and `ScheduledBackup` examples omitted plugin backup configuration after the Barman Cloud plugin conversion. Added `method: plugin` and `pluginConfiguration.name`.
- The PITR example used deprecated `externalClusters[].barmanObjectStore`. Updated it to the plugin-based `externalClusters[].plugin` configuration.
- Monitoring examples used deprecated automatic `enablePodMonitor` behavior and a `ServiceMonitor`. Updated the example to use a manually managed `PodMonitor`, which is the current recommended approach.
- The switchover section showed an undocumented `cnpg.io/targetPrimary` annotation. Removed that alternative and kept the documented `kubectl cnpg promote` command.
- The PgBouncer section incorrectly embedded `pooler` under the `Cluster` spec. Replaced it with the separate `Pooler` custom resource used by CloudNativePG.
- The database bootstrap text referred to `postInitSQL` while the snippet used `postInitApplicationSQL`. Updated the text to match the actual field.
- The post overstated rolling updates as "zero-downtime PostgreSQL upgrades." Adjusted wording to "controlled rolling updates" because CloudNativePG documentation notes that switchovers can require application reconnects.

## Review Notes
- YAML snippets were parsed locally after edits to catch syntax errors.
- The post now assumes the Barman Cloud plugin is installed for object-store backup examples; a future improvement would be adding a short plugin installation example.
