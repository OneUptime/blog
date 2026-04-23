# Validation Summary: How to Deploy PostgreSQL on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- PostgreSQL
- Helm
- Bitnami PostgreSQL Helm chart
- CloudNativePG
- Barman Cloud CNPG-I plugin
- PgBouncer

## Sources Consulted
- Bitnami PostgreSQL Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md
- Bitnami PostgreSQL chart helpers: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/postgresql/templates/_helpers.tpl
- Helm install reference: https://helm.sh/docs/helm/helm_install/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- CloudNativePG installation and upgrades: https://cloudnative-pg.io/docs/1.29/installation_upgrade/
- CloudNativePG backup documentation: https://cloudnative-pg.io/docs/1.29/backup/
- CloudNativePG container image requirements: https://cloudnative-pg.io/docs/1.29/container_images/
- CloudNativePG operator capability levels: https://cloudnative-pg.io/docs/1.29/operator_capability_levels/
- CloudNativePG bootstrap documentation: https://cloudnative-pg.io/docs/1.26/bootstrap
- Barman Cloud Plugin introduction: https://cloudnative-pg.io/plugin-barman-cloud/docs/intro/
- Barman Cloud Plugin installation: https://cloudnative-pg.io/plugin-barman-cloud/docs/installation/
- Barman Cloud Plugin usage: https://cloudnative-pg.io/plugin-barman-cloud/docs/next/usage/
- Barman Cloud Plugin object store providers: https://cloudnative-pg.io/plugin-barman-cloud/docs/object_stores/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The Bitnami example configured `readReplicas.replicaCount` without setting `architecture: replication`. I added `architecture: replication` because the chart only uses `readReplicas.*` in replication mode.
- The CloudNativePG example used the deprecated in-tree `.spec.backup.barmanObjectStore` configuration. I replaced it with the current Barman Cloud Plugin workflow, added the plugin installation step, introduced an `ObjectStore` resource, and changed the cluster to use `.spec.plugins`.
- The `ScheduledBackup` example used a five-field cron expression (`0 2 * * *`), but current CloudNativePG scheduled backups use a six-field cron format with seconds. I changed it to `0 0 2 * * *`.
- The `ScheduledBackup` manifest did not specify the plugin backup method after moving backups to the Barman Cloud Plugin. I added `method: plugin` and `pluginConfiguration.name: barman-cloud.cloudnative-pg.io`.
- The application deployment referenced `app-db-secret` from the `production` namespace even though the Secret was created in `databases`. I changed the deployment namespace to `databases` so the `secretKeyRef` is valid.
- The application’s read-only host pointed to the `-r` service, which targets any PostgreSQL instance, not only replicas. I changed it to the `-ro` service.
- The troubleshooting command used `deployment/cnpg-controller-manager`, but the documented default deployment name for a Helm install with release name `cnpg` is `cnpg-cloudnative-pg`. I updated the command accordingly.
- The CloudNativePG manifest used `monitoring.enablePodMonitor`, which is deprecated. I removed the deprecated field rather than leaving a production example on a deprecated API.
- Method 2 did not create the `databases` namespace before creating namespaced Secrets and resources. I added an idempotent namespace creation command.

## Review Notes
- `imageName` is still valid in CloudNativePG, but version 1.29 recommends image catalogs for centralized image management. The current post remains technically correct with `imageName`.
- Bitnami still supports the chart repo workflow used in the post, though the chart is also available through OCI.
- The example credentials are placeholders for documentation only. In a real production deployment, they should be replaced with real Secrets management rather than inline literals.
