# Validation Summary: How to Implement Prometheus Federation Hierarchies

## Status
validated

## Post Type
Tutorial / Guide — a deep technical walkthrough on designing and implementing multi-tier Prometheus federation with concrete configuration examples.

## Technologies Covered
- Prometheus (server, federation, recording rules, alerting, web TLS, oauth2, remote_read)
- PromQL (recording rule expressions, ad-hoc queries)
- Prometheus Operator (`monitoring.coreos.com/v1` CRD)
- Kubernetes (Services, service discovery, pod/node/service roles)
- mTLS authentication
- File-based service discovery (Prometheus `file_sd`)

## Sources Consulted
- Prometheus Configuration reference — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTPS / web TLS reference — https://prometheus.io/docs/prometheus/latest/configuration/https/
- Prometheus Federation docs — https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus Jobs and instances (auto-generated metrics) — https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus Storage / TSDB — https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus Operator API reference — https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes service discovery relabel patterns (community-standard `prometheus.io/port` pattern as used by kube-prometheus / Helm chart)

## Issues Found

1. **Invalid PromQL: `histogram_quantile()` over `scrape_duration_seconds_bucket`.**
   The query `histogram_quantile(0.95, sum by (job, le) (scrape_duration_seconds_bucket{job=~"federate-.*"}))` is invalid — `scrape_duration_seconds` is a gauge auto-generated per scrape, not a histogram; there is no `_bucket` series and no `le` label. Replaced with `quantile(0.95, scrape_duration_seconds{job=~"federate-.*"})`, which is the correct way to get a 95th-percentile over the instant vector of gauge values.

2. **Invalid PromQL: data lag via `prometheus_target_metadata_cache_bytes`.**
   `time() - max by (job) (prometheus_target_metadata_cache_bytes{...})` subtracts a byte count from a Unix timestamp — the metric measures the metadata cache size, not scrape time. Replaced with `time() - max by (job) (timestamp(up{job=~"federate-.*"}))`, which yields the seconds since the last successful sample (the standard idiom for measuring scrape lag).

3. **Wrong location/key for Prometheus web TLS config.**
   The post placed mTLS server settings under `web.tls_config:` inside `prometheus.yml`. Per the Prometheus HTTPS docs, web TLS belongs in a separate file passed via `--web.config.file`, and the top-level key is `tls_server_config:` (not `tls_config:`). Rewrote the snippet as a standalone `web-config.yml` with the correct `tls_server_config` key, while leaving the client-side `tls_config` in the scrape job (which is correct as-is).

4. **Broken relabel for `prometheus.io/port` annotation in the Kubernetes pods scrape job.**
   The original rule had `source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]`, `regex: (.+)`, `replacement: ${1}`, `target_label: __address__` — this would overwrite `__address__` with just the port number, breaking scrapes. Replaced with the community-standard pattern combining `__address__` and the port annotation: `source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]`, `regex: ([^:]+)(?::\d+)?;(\d+)`, `replacement: $1:$2` — which correctly preserves the host and substitutes the annotated port.

## Review Notes

- The "Memory Planning" formula (`time_series_count * 2KB * chunks_per_series`) is a rough operational rule-of-thumb that overstates RAM needs (Prometheus keeps only the head block — roughly the last 2 hours — in memory; older data stays on disk). The post correctly hedges with "rough estimate", and similar formulas appear elsewhere in the community, so I left it alone. Readers should treat the output as an upper bound, not a planning target.
- The "120 chunks per series" example phrasing conflates chunks with blocks (TSDB blocks are 2 hours by default; chunks are cut every ~120 samples or 2 hours). The arithmetic in the example still produces a plausible bytes figure, so I did not rewrite it.
- The mermaid diagram arrows between Edge and Applications (`E1 --> A1`) are directionally counter to data flow (Prometheus scrapes pull *from* apps), but the arrow direction matches the "who scrapes/federates whom" convention used consistently throughout the diagram, so it's coherent rather than incorrect.
- The regional "weighted average error rate" formula multiplies a ratio metric (`dc:http_errors:rate5m`) by the request-rate weight and divides by total weight — this is a mathematically valid weighted-mean reconstruction, even though it depends on the recording-rule semantics defined just above it.
- The regional P99 latency via `max(dc:http_latency_p99:5m)` is explicitly flagged as an approximation in the post — quantiles are not additive, so this is the expected pragmatic compromise.
- All other configuration snippets (oauth2, remote_read, Prometheus Operator CRD with `replicaExternalLabelName` / `retention: 30d`, file_sd JSON format, recording-rule group syntax) check out against current Prometheus / Operator docs.
