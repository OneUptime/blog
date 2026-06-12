# Validation Summary: How to Use Grafana Mimir for Metrics

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Grafana Mimir
- Prometheus remote write
- PromQL recording and alerting rules
- Grafana data sources
- Kubernetes Deployments, StatefulSets, and HPAs
- Object storage backends for metrics blocks
- Multi-tenancy and tenant federation

## Sources Consulted
- Grafana Mimir deployment modes: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir architecture: https://grafana.com/docs/mimir/latest/get-started/about-grafana-mimir-architecture/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir object storage backend configuration: https://grafana.com/docs/mimir/latest/configure/configure-object-storage-backend/
- Grafana Mimir authentication and authorization: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Grafana Mimir HTTP API: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir query-frontend component docs: https://grafana.com/docs/mimir/latest/references/architecture/components/query-frontend/
- Grafana Mimir ruler component docs: https://grafana.com/docs/mimir/latest/references/architecture/components/ruler/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/

## Issues Found
- Updated Mimir examples from `grafana/mimir:2.11.0` to `grafana/mimir:3.1.0` because the post should use current, non-deprecated examples.
- Removed the `read` / `write` target deployment example because those targets are not available in the current Mimir 3.1 binary and current Mimir docs describe monolithic and microservices deployment modes.
- Removed unsupported `ingester.max_chunk_age` from the Mimir config. Mimir TSDB block behavior is configured under `blocks_storage.tsdb`, and this field does not parse in current Mimir.
- Moved `query_ingesters_within` into `limits`, where the current Mimir YAML config expects it.
- Changed runtime config reload syntax back to `runtime_config.period`, matching the current Mimir config output and parser.
- Added `tenant_federation.enabled: true` for pipe-separated multi-tenant query examples.
- Added required remote-write headers for the direct `curl` push example: Snappy content encoding and `X-Prometheus-Remote-Write-Version`.
- Replaced invalid `ruler.storage` config with top-level `ruler_storage`, which is the current Mimir configuration block for rule storage.
- Moved query step alignment into `limits.align_queries_with_step`; `frontend.align_queries_with_step` does not parse in current Mimir YAML.
- Removed the Prometheus scrape example for `/prometheus/federate` from Mimir because it is not a documented Mimir query endpoint.
- Removed the Kubernetes `httpGet` lifecycle call to `/ingester/shutdown` because that endpoint requires `POST`, while a Kubernetes `httpGet` hook sends `GET`.
- Removed the HPA example that scaled on `cortex_distributor_received_samples_total` directly, because it is a counter and not suitable as an HPA average value without a metrics adapter rate conversion.
- Replaced the downsampling recommendation with recording rules for lower-cardinality long-term views, since native Mimir downsampling is not documented as a built-in feature.

## Review Notes
- YAML snippets were parsed for syntax.
- Mimir configuration snippets were checked against the `grafana/mimir:3.1.0` Docker image.
- Prometheus config snippets were checked with `promtool check config`.
- Recording and alerting rules were checked with `promtool check rules`.
