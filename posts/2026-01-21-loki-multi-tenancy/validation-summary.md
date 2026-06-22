# Validation Summary: How to Implement Multi-Tenancy in Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Loki runtime configuration and tenant overrides
- Loki retention and compactor configuration
- Promtail
- Grafana data source provisioning
- NGINX reverse proxy configuration
- OAuth2 Proxy
- Kong Gateway
- PromQL and Prometheus alerting rules

## Sources Consulted
- Grafana Loki multi-tenancy documentation: https://grafana.com/docs/loki/latest/operations/multi-tenancy/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki upgrade notes for Loki 3.x: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail tenant stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/tenant/
- Grafana Loki Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana provisioning documentation for custom HTTP headers: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Loki key metrics documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/metrics/
- OAuth2 Proxy configuration documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
- Kong Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The basic Loki storage example used `boltdb_shipper` with a TSDB schema and included `shared_store`, which is removed in Loki 3.x. Changed it to `tsdb_shipper` and removed `shared_store`.
- The post showed per-tenant `overrides` directly in the main Loki config. Current Loki uses runtime configuration for tenant overrides. Added `runtime_config.file` and moved the override examples into `/etc/loki/overrides.yaml`.
- Retention examples used per-tenant `retention_period` without enabling compactor retention. Added a `compactor` block with `retention_enabled: true` and `delete_request_store: s3`.
- The NGINX regex location used `proxy_pass` with a URI, which NGINX does not allow in regex locations. Replaced it with a `rewrite ... break` plus `proxy_pass http://loki`.
- The Kong Request Transformer example used `add` for `X-Scope-OrgID`, which can leave a client-supplied header unchanged. Changed it to `replace` so the gateway controls the tenant header.
- The Promtail section did not mention Promtail's March 2, 2026 EOL. Added a caveat that the examples apply only to existing Promtail deployments and that new deployments should use Grafana Alloy or another supported client.
- The monitoring examples used `loki_distributor_lines_dropped_total`, which is not the current recommended discarded-sample metric. Replaced it with `loki_discarded_samples_total` grouped by tenant and reason.
- The per-tenant no-logs alert used `absent(...)` in a way that could not preserve a tenant label. Replaced it with a tenant-grouped zero-rate expression for tenants with existing time series.

## Review Notes
- The snippets are still examples and omit environment-specific object store credentials, bucket names, TLS, and full Kubernetes manifests.
- The `TenantNoLogs` alert can only alert for tenants that still have recent enough metric series. A production-grade "missing tenant" alert should join Loki ingestion metrics with an authoritative expected-tenant inventory.
- Promtail syntax remains valid for legacy deployments, but it is no longer a supported choice for new deployments after its March 2, 2026 EOL.
