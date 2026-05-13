# Validation Summary: How to Deploy CloudNativePG PostgreSQL Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CloudNativePG
- PostgreSQL
- Kubernetes
- Flux CD
- HelmRelease
- HelmRepository
- Kustomization
- Kubernetes Secrets
- ScheduledBackup
- Prometheus PodMonitor

## Sources Consulted
- CloudNativePG Helm chart documentation: https://cloudnative-pg.io/charts/
- CloudNativePG chart metadata and values: https://github.com/cloudnative-pg/charts/tree/main/charts/cloudnative-pg
- CloudNativePG 1.29 installation and upgrade documentation: https://cloudnative-pg.io/docs/1.29/installation_upgrade/
- CloudNativePG 1.29 backup documentation: https://cloudnative-pg.io/docs/1.29/backup/
- CloudNativePG 1.29 replication documentation: https://cloudnative-pg.io/docs/1.29/replication/
- CloudNativePG 1.29 release notes: https://cloudnative-pg.io/docs/1.29/release_notes/v1.29/
- CloudNativePG labels and annotations documentation: https://cloudnative-pg.io/docs/devel/labels_annotations/
- Barman Cloud Plugin documentation: https://cloudnative-pg.io/plugin-barman-cloud/docs/concepts/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post pinned the CloudNativePG Helm chart to `0.21.6`, which is outdated. Updated it to `0.28.2`, the current chart version verified from the official chart metadata, and adjusted the Kubernetes prerequisite for CloudNativePG 1.29.x.
- The ScheduledBackup used a five-field cron expression. CloudNativePG uses a six-field cron expression with seconds as the first field, so the schedule was changed from `0 2 * * *` to `0 0 2 * * *`.
- The Flux health check referenced `cnpg-controller-manager`, which is the default Deployment name for manifest-based installs. The Helm chart renders the Deployment from the Helm release name, so the health check was changed to `cloudnative-pg` for the shown HelmRelease.
- The verification commands assumed `postgres-primary-1` was always the primary. Updated the commands to select the current primary pod using the `cnpg.io/instanceRole=primary` label before running `psql`.
- The best-practices section recommended the deprecated `minSyncReplicas` field. Updated the cluster example and recommendation to use the current `postgresql.synchronous` configuration.

## Review Notes
The `barmanObjectStore` backup configuration remains valid in CloudNativePG 1.29 for backward compatibility, but CloudNativePG documents it as deprecated since 1.26 and recommends the Barman Cloud Plugin for new object-store backup deployments.
