# Validation Summary: How to Deploy PostgreSQL HA Clusters on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Kubernetes
- CloudNativePG
- Barman Cloud Plugin
- PgBouncer
- Prometheus Operator PodMonitor
- Helm
- kubectl

## Sources Consulted
- CloudNativePG installation and upgrades documentation: https://cloudnative-pg.io/docs/1.29/installation_upgrade/
- CloudNativePG Helm chart documentation: https://github.com/cloudnative-pg/charts/blob/main/charts/cloudnative-pg/README.md
- CloudNativePG bootstrap documentation: https://cloudnative-pg.io/docs/1.29/bootstrap/
- CloudNativePG monitoring documentation: https://cloudnative-pg.io/docs/1.29/monitoring/
- CloudNativePG labels and annotations documentation: https://cloudnative-pg.io/docs/1.28/labels_annotations/
- CloudNativePG connection pooling documentation: https://cloudnative-pg.io/docs/1.28/connection_pooling/
- CloudNativePG service management / architecture documentation: https://cloudnative-pg.io/docs/1.27/architecture/
- CloudNativePG PostgreSQL upgrades documentation: https://cloudnative-pg.io/docs/1.29/postgres_upgrades/
- CloudNativePG official image catalog: https://raw.githubusercontent.com/cloudnative-pg/artifacts/refs/heads/main/image-catalogs/catalog-minimal-trixie.yaml
- Barman Cloud Plugin installation documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/installation/
- Barman Cloud Plugin usage documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/
- Barman Cloud Plugin API reference: https://cloudnative-pg.io/plugin-barman-cloud/docs/next/plugin-barman-cloud.v1/
- Barman Cloud API package reference: https://pkg.go.dev/github.com/cloudnative-pg/barman-cloud/pkg/api

## Issues Found
- The operator install manifest was pinned to CloudNativePG 1.22.0. Updated it to the current 1.29.1 manifest and used the documented `kubectl apply --server-side` command.
- The Helm install command used `helm install`, which fails if the release already exists. Changed it to `helm upgrade --install`, matching the current chart documentation.
- PostgreSQL examples used the outdated `ghcr.io/cloudnative-pg/postgresql:16.1` image. Updated examples to the current PostgreSQL 16 image from the official CloudNativePG image catalog.
- The application credentials secret was created as a default opaque secret. Added `--type=kubernetes.io/basic-auth`, which CloudNativePG requires for supplied bootstrap application secrets.
- The cluster manifest used `.spec.monitoring.enablePodMonitor`, which is deprecated. Replaced it with non-deprecated monitoring configuration and kept the manual PodMonitor example.
- The commands for finding the primary used the deprecated `role` pod label. Replaced it with `cnpg.io/instanceRole`.
- The backup example used deprecated in-tree `.spec.backup.barmanObjectStore` configuration. Reworked it to use the current Barman Cloud Plugin, `ObjectStore`, `Cluster.spec.plugins`, and plugin-based `ScheduledBackup`.
- The scheduled backup cron expression used five fields. CloudNativePG `ScheduledBackup` uses a six-field cron format with seconds, so it was changed to `0 0 0 * * *`.
- The PgBouncer example mixed `managed.services.additional` with a `Pooler` resource. Replaced it with a standalone `Pooler` manifest using `serviceTemplate`, which is the documented approach.
- One listed metric, `cnpg_pg_stat_activity_count`, was not part of the current documented/default CloudNativePG metric set. Replaced it with current metrics from the predefined metrics and default monitoring query set.
- The upgrade section implied changing any PostgreSQL image tag is enough for version upgrades. Clarified that the example is for minor image updates and that major upgrades require CloudNativePG's PostgreSQL upgrade procedure.

## Review Notes
- The post is now technically valid for CloudNativePG 1.29-era APIs. The Barman Cloud Plugin requires cert-manager and CloudNativePG 1.26 or newer; the post now notes cert-manager before the plugin install command.
