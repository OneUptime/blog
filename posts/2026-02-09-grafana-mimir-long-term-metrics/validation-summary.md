# Validation Summary: How to Deploy Grafana Mimir for Long-Term Kubernetes Metrics Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Mimir
- Kubernetes StatefulSets, Deployments, Services, and ConfigMaps
- Prometheus remote write
- Prometheus Operator Prometheus custom resource
- Grafana Prometheus data source provisioning
- AWS S3, Google Cloud Storage, Azure Blob Storage, and MinIO object storage
- PromQL

## Sources Consulted
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir metrics storage retention: https://grafana.com/docs/mimir/latest/configure/configure-metrics-storage-retention
- Grafana Mimir deployment modes: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir hash rings and memberlist configuration: https://grafana.com/docs/mimir/latest/configure/configure-hash-rings/
- Grafana Mimir runtime configuration: https://grafana.com/docs/mimir/latest/configure/about-runtime-configuration
- Grafana Mimir querying and Grafana data source guidance: https://grafana.com/docs/mimir/latest/query/ and https://grafana.com/docs/mimir/latest/visualize/
- Grafana Mimir migration guidance noting unsupported Thanos downsampling: https://grafana.com/docs/mimir/latest/set-up/migrate/migrate-from-thanos-or-prometheus/
- Grafana Mimir GitHub releases for current version: https://github.com/grafana/mimir/releases
- AWS CLI S3 mb command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/mb.html
- AWS CLI IAM create-user and put-user-policy references: https://docs.aws.amazon.com/cli/latest/reference/iam/create-user.html and https://docs.aws.amazon.com/cli/latest/reference/iam/put-user-policy.html

## Issues Found
- The post described compactors as downsampling blocks and included a `downsampling_enabled` configuration. Grafana Mimir does not support Thanos-style downsampling, so the architecture text and downsampling section were corrected to focus on compaction, retention, and recording aggregate series.
- The retention example used Loki-style `compactor.retention_enabled` and `compactor.retention_period` fields. Mimir configures object-storage retention with `limits.compactor_blocks_retention_period`, so the snippets were updated.
- The Azure object storage snippet used `storage_account_name`, but Mimir's Azure backend uses `account_name`. Updated the field name.
- The Kubernetes/memberlist example used memberlist rings without configuring `memberlist.join_members`. Added a Kubernetes DNS SRV join target for the headless service.
- The distributed deployment example omitted store-gateways even though queriers need store-gateways to query object storage in microservices mode. Added a store-gateway StatefulSet.
- The per-tenant overrides example implied overrides could live directly in the main Mimir configuration. Updated it to show default limits in `mimir.yaml` and tenant overrides in a runtime configuration file.
- The query results cache snippet used `query_frontend`, but Mimir's YAML block is `frontend` and result caching must be enabled with `cache_results: true`. Updated the snippet.
- The troubleshooting resource examples placed Kubernetes `resources` under Mimir config blocks. Replaced them with Kubernetes container resource fragments.
- The examples pinned `grafana/mimir:2.10.0`, which is outdated for a post reviewed on 2026-06-04. Updated the image tag to the current 3.1.0 release.

## Review Notes
The distributed-mode manifests are still illustrative rather than a complete production install; Grafana recommends the `mimir-distributed` Helm chart for production deployments. The corrected snippets now avoid invalid Mimir fields and include the core components needed for the described architecture.
