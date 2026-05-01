# Validation Summary: How to Deploy Nextcloud on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Nextcloud
- PostgreSQL
- Redis
- S3-compatible object storage
- Ingress / NGINX Ingress
- Longhorn persistent storage

## Sources Consulted
- Nextcloud Helm chart README: https://github.com/nextcloud/helm/blob/main/charts/nextcloud/README.md
- Nextcloud Helm chart values: https://github.com/nextcloud/helm/blob/main/charts/nextcloud/values.yaml
- Nextcloud Helm chart metadata and dependencies: https://github.com/nextcloud/helm/blob/main/charts/nextcloud/Chart.yaml
- Nextcloud object storage documentation: https://docs.nextcloud.com/server/latest/admin_manual/configuration_files/primary_storage.html
- Nextcloud background jobs documentation: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/background_jobs_configuration.html
- Nextcloud `occ` documentation: https://docs.nextcloud.com/server/stable/admin_manual/occ_command.html
- Nextcloud transactional file locking documentation: https://docs.nextcloud.com/server/stable/admin_manual/configuration_files/files_locking_transactional.html
- Nextcloud memory caching documentation: https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/caching_configuration.html
- Nextcloud Docker image documentation: https://github.com/nextcloud/docker/blob/master/README.md
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The PostgreSQL example enabled the bundled `postgresql` subchart but did not disable the chart's default SQLite database or configure `externalDatabase`, which the official chart requires when using PostgreSQL. I added `internalDatabase.enabled: false` and the matching `externalDatabase` settings.
- The S3 section treated S3 as externally mounted storage configured through `occ`. Nextcloud documents this as primary object storage configured in `config.php`, and the Helm chart exposes it through `nextcloud.objectStore.s3.*`. I replaced the unsupported live `occ` commands with the chart's documented S3 values and `helm upgrade`.
- The background job section used a custom CronJob manifest that would not work as written because it referenced an undefined volume and bypassed the chart's supported background-job configuration. I replaced it with the chart's documented `cronjob.enabled` configuration.
- The Redis section installed a separate Redis chart and then set only `redis host` through `occ`, which was incomplete for Nextcloud's documented Redis configuration. I replaced it with the chart's documented built-in Redis integration using `redis.enabled` and `redis.auth.password`.
- The Redis step described Redis as storage. I corrected it to caching and file locking, which matches Nextcloud's documentation.
- The conclusion overstated the scaling guarantees. I softened it to describe support for larger deployments rather than claiming horizontal scaling from S3 and Redis alone.

## Review Notes
- The tutorial is mostly Kubernetes- and Helm-centric rather than Rancher-specific, but it is still technically relevant for Rancher-managed clusters.
- The current official Nextcloud Helm chart metadata shows chart version `9.0.5` with `appVersion: 33.0.2`, so the reviewed guidance aligns with a current chart generation as of 2026-05-01.
- The S3 object-store step should be applied before users upload data; Nextcloud documents that switching an existing instance to primary object storage makes existing files inaccessible.
