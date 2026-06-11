# Validation Summary: How to Build Prometheus Consul SD (Service Discovery)

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Prometheus (service discovery via `consul_sd_configs`, relabeling, alerting rules)
- HashiCorp Consul (service registration, HTTP API, ACL tokens, namespaces, multi-datacenter)
- python-consul client library
- Docker Compose (Consul + Prometheus deployment)
- Kubernetes (combining `kubernetes_sd_configs` with `consul_sd_configs`)
- PromQL (alerting expressions on SD health metrics)

## Sources Consulted
- Prometheus `consul_sd_config` documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#consul_sd_config
- Prometheus discovery source (`discovery/metrics.go`, `discovery/metrics_refresh.go`) for the `prometheus_sd_*` metric names
- Consul Agent Services HTTP API: https://developer.hashicorp.com/consul/api-docs/agent/service
- Consul Catalog/Health/Status HTTP API endpoints (`/v1/catalog/services`, `/v1/catalog/service/:name`, `/v1/health/service/:name`, `/v1/status/leader`)
- Consul service definition format docs (JSON and HCL)
- python-consul library `agent.service.register()` and `Check.http()` signatures

## Issues Found
1. **Consul SD meta labels table was inaccurate** — `__meta_consul_metadata_<key>` was described as "Service metadata", but per Prometheus docs this label exposes **node** metadata. The label that actually exposes service metadata is `__meta_consul_service_metadata_<key>`, which is used extensively throughout the post's relabel configs (`__meta_consul_service_metadata_env`, `_team`, `_metrics_path`, `_version`) but was missing from the table.

   Fix: Corrected the description of `__meta_consul_metadata_<key>` to "Node metadata", added a row for `__meta_consul_service_metadata_<key>` (Service metadata), and also added `__meta_consul_partition`. Also clarified that `__meta_consul_tagged_address_<key>` refers to node tagged addresses, and that `__meta_consul_tags` is joined by the configured tag separator.

## Review Notes
- All Consul HTTP API endpoints (`/v1/agent/service/register`, `/v1/catalog/services`, `/v1/catalog/service/:name`, `/v1/health/service/:name`, `/v1/status/leader`) are correct.
- `consul_sd_config` options (`server`, `token`, `token_file`, `scheme`, `tls_config`, `tags`, `datacenter`, `namespace`, `refresh_interval`) are all valid. Note that `tags` is technically deprecated in favor of `filter` in newer Prometheus versions but still functions.
- The JSON service definition uses the lowercase/snake_case style — Consul accepts both PascalCase (matching the HTTP API) and lowercase keys in JSON service definition files, so both examples in the post are valid.
- Prometheus SD metrics `prometheus_sd_discovered_targets`, `prometheus_sd_refresh_failures_total`, and `prometheus_sd_refresh_duration_seconds` are all real metric names. Note that a histogram variant `prometheus_sd_refresh_duration_histogram_seconds` also exists in recent versions.
- The python-consul `Consul()` constructor, `agent.service.register()` keyword arguments, and `Check.http()` helper are all valid for the library.
- The "Custom Metrics Path" relabel rule that uses `regex: ''` to default to `/metrics` is functionally unnecessary because Prometheus already defaults `__metrics_path__` to `/metrics`; the first rule's `regex: (.+)` already prevents overwriting it with an empty value. This is a stylistic redundancy, not a correctness bug — left as-is.
- The `docker-compose.yml` `version: '3.8'` field is obsolete in modern Docker Compose but is still accepted and emits only a warning. Not changed.
