# Validation Summary: How to Deploy Grafana Mimir for Multi-Tenant Prometheus Metrics Storage

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Mimir
- Prometheus remote write
- Docker Compose
- MinIO
- Kubernetes
- Helm
- Grafana data source provisioning
- NGINX reverse proxy
- TLS and S3 server-side encryption
- PromQL

## Sources Consulted
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir authentication and authorization: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Grafana Mimir runtime configuration: https://grafana.com/docs/mimir/latest/configure/about-runtime-configuration
- Grafana Mimir metrics storage retention: https://grafana.com/docs/mimir/latest/configure/configure-metrics-storage-retention
- Grafana Mimir Helm chart configuration: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/configuration-with-helm/
- Grafana Mimir Helm chart values: https://raw.githubusercontent.com/grafana/mimir/main/operations/helm/charts/mimir-distributed/values.yaml
- Grafana Mimir TLS security documentation: https://grafana.com/docs/mimir/latest/manage/secure/securing-communications-with-tls/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana data source provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- Removed the obsolete Docker Compose top-level `version` field because current Compose treats it as informative only and emits an obsolete warning.
- Added a `minio/mc` bucket creation service because the Mimir S3 configuration referenced `mimir-blocks`, but the Compose setup did not create that MinIO bucket.
- Added `runtime_config.file` and an initial `runtime.yaml` because Mimir per-tenant overrides are loaded from runtime configuration, not from a top-level `overrides` block in the main Mimir config.
- Moved per-tenant override examples to `runtime.yaml` and changed the invalid `max_query_length` key to `max_query_lookback`.
- Corrected the Helm storage example to use `mimir.structuredConfig.common.storage` instead of a standalone `blocks_storage` override, and removed the non-chart top-level `multitenancy_enabled` value.
- Replaced invalid query limit keys (`query_timeout`, `max_query_length`, `max_samples_per_query`, `max_query_series`, and `split_queries_by_interval`) with current Mimir configuration fields under `limits` and `querier`.
- Split retention examples between `mimir-config.yaml` defaults and `runtime.yaml` per-tenant overrides, matching Mimir retention documentation.
- Replaced the undocumented `allowed_federation_tenants` override example with documented tenant federation settings and clarified that authorization must be enforced in the authentication proxy.
- Corrected the TLS client configuration from `ingester.client_config` to `ingester_client.grpc_client_config`.

## Review Notes
- Verified representative Mimir snippets with `grafana/mimir:latest` (`3.1.0`) using `-print.config`.
- Verified the Prometheus remote write snippet with `prom/prometheus:latest` (`3.11.3`) using `promtool check config`.
- Verified the Docker Compose snippet with `docker compose config`.
