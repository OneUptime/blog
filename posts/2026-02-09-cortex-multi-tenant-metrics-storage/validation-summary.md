# Validation Summary: How to Configure Cortex Multi-Tenant Metrics Storage for Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cortex
- Kubernetes
- Prometheus and Prometheus Operator
- Grafana data source provisioning
- NGINX reverse proxy authentication
- PromQL

## Sources Consulted
- Cortex configuration file reference: https://cortexmetrics.io/docs/configuration/configuration-file/
- Cortex Authentication and Authorisation guide: https://cortexmetrics.io/docs/guides/auth/
- Cortex HTTP API reference: https://cortexmetrics.io/docs/api/
- Cortex store-gateway documentation: https://cortexmetrics.io/docs/blocks-storage/store-gateway/
- Cortex Overrides Exporter guide: https://cortexmetrics.io/docs/guides/overrides-exporter/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Cortex v1.16.0 container help output from `quay.io/cortexproject/cortex:v1.16.0`

## Issues Found
- The main Cortex manifest used old chunk-storage ingester fields that are not valid for Cortex v1.16.0 blocks storage. Removed those fields and kept the TSDB blocks storage settings.
- The blocks-storage deployment omitted store-gateway and compactor components, which are required for querying blocks and enforcing blocks retention. Added store-gateway and compactor deployments and services.
- The query-frontend was deployed without configuring queriers to connect to it. Added `frontend_worker.frontend_address` and exposed the query-frontend gRPC port.
- The querier was not configured to query store-gateway in blocks-storage mode. Added `querier.store_gateway_addresses` and a store-gateway service.
- The memberlist ring configuration lacked Kubernetes join-member wiring. Added `memberlist.join_members` and a headless memberlist service.
- Per-tenant overrides were shown under deprecated/incorrect `limits.per_tenant_override_*` keys. Replaced them with the supported `runtime_config.file` and `runtime_config.period` configuration.
- Runtime overrides were referenced but not mounted in the component manifests. Added a runtime ConfigMap and mounts for the Cortex components.
- The NGINX auth proxy referenced an htpasswd file that was never mounted. Added an htpasswd Secret, mounted it, and pointed `auth_basic_user_file` to the mounted path.
- The NetworkPolicy claim said it prevented cross-tenant queries, but Kubernetes NetworkPolicy restricts network access rather than Cortex tenant identity. Reworded it to describe endpoint access restriction.
- The audit logging example used the wrong configuration block and `0s`, which disables query logging for Cortex query-frontend. Moved it to `frontend.log_queries_longer_than` and used `-1s` to log all queries.
- The tenant cost allocation PromQL described fetched store-gateway data as storage usage and used a weak query-cost expression. Reworded the metric description and simplified query volume tracking.

## Review Notes
The examples are now technically consistent with Cortex v1.16.0 configuration and current official documentation. Production deployments should still add real S3 credentials or IAM integration, TLS, readiness probes, resource sizing, and a stronger auth proxy policy before use.
