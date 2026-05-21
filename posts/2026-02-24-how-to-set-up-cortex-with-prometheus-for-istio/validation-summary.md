# Validation Summary: How to Set Up Cortex with Prometheus for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cortex
- Prometheus remote write
- Prometheus Operator
- Istio metrics
- Kubernetes
- Helm
- Grafana Prometheus datasource configuration
- Amazon S3 object storage

## Sources Consulted
- Cortex official documentation: https://cortexmetrics.io/docs/
- Cortex HTTP API reference: https://cortexmetrics.io/docs/api/
- Cortex Authentication and Authorisation guide: https://cortexmetrics.io/docs/guides/auth/
- Cortex Blocks Storage documentation: https://cortexmetrics.io/docs/blocks-storage/
- Cortex Configuration File reference: https://cortexmetrics.io/docs/configuration/configuration-file/
- Cortex runtime configuration and overrides documentation: https://cortexmetrics.io/docs/configuration/arguments/
- Cortex Helm chart block storage guide: https://cortexproject.github.io/cortex-helm-chart/guides/getting_started_with_block_storage.html
- Cortex Helm chart values.yaml: https://github.com/cortexproject/cortex-helm-chart/blob/master/values.yaml
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write specification: https://prometheus.io/docs/specs/prw/remote_write_spec/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The architecture overview said queriers read historical data from "Store". Cortex's blocks architecture uses the Store Gateway for historical blocks, so the wording was changed to "Store Gateway".
- The Helm values used `X-Scope-OrgID` later in the post but did not enable Cortex authentication/multi-tenancy. Added `config.auth_enabled: true` so Cortex uses tenant IDs from `X-Scope-OrgID`.
- The ingester values requested a persistent volume without enabling the chart's ingester StatefulSet. The chart only creates ingester PVCs when `ingester.statefulSet.enabled` is true, so that setting was added.
- The per-tenant override example used `config.limits.per_tenant_override_config`, which is not a current Cortex config key. Replaced it with the chart-compatible `config.runtime_config.file` plus `runtimeconfigmap.runtime_config.overrides`.
- The query result cache example placed `results_cache` under `query_frontend`, but Cortex configures query result caching under `query_range`. Updated the snippet to use `config.query_range.cache_results` and `config.query_range.results_cache.cache.memcached_client.addresses`.
- The retention example used `compactor.deletion_enabled` and `compactor.blocks_retention_period`, which are not Cortex config fields. Updated it to `config.limits.compactor_blocks_retention_period`.

## Review Notes
- The Prometheus Operator `remoteWrite`, `writeRelabelConfigs`, `queueConfig`, and `externalLabels` fields are valid camelCase fields for the Prometheus custom resource.
- The plain Prometheus `remote_write`, `write_relabel_configs`, `queue_config`, and custom `headers` examples match Prometheus configuration syntax.
- Cortex documents `POST /api/v1/push` as the remote write endpoint, and `X-Scope-OrgID` as the tenant header when multi-tenancy is enabled.
