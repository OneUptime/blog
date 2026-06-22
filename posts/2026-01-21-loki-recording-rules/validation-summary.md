# Validation Summary: How to Use Loki Recording Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Loki Ruler
- Loki recording rules
- LogQL
- Prometheus remote write
- Prometheus remote write receiver
- Grafana dashboards
- Kubernetes ConfigMaps

## Sources Consulted
- Grafana Loki documentation: Manage recording rules - https://grafana.com/docs/loki/latest/operations/recording-rules/
- Grafana Loki documentation: Configuration parameters - https://grafana.com/docs/loki/latest/configure/
- Grafana Loki documentation: Metric queries - https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki documentation: LogQL reference / pipeline errors - https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki documentation: HTTP API / Ruler endpoints - https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Prometheus documentation: Command-line flags - https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus documentation: Remote write receiver API note - https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus documentation: Configuration file and command-line configuration split - https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The description referred to "query result caching"; changed it to "pre-computation" because Loki recording rules produce new time series via periodic evaluation and remote write, not a cache layer.
- The first Loki ruler remote write snippet used `remote_write.client`; changed it to the current `remote_write.clients.default` form shown in Loki recording rule documentation.
- The Prometheus receiver example incorrectly configured `remote_write` in `prometheus.yml`, which sends samples out instead of enabling ingestion. Replaced it with the required `--web.enable-remote-write-receiver` command-line flag.
- The Ruler API examples described `/loki/api/v1/rules/fake` as tenant-specific. Corrected the wording to namespace-specific; Loki tenant selection is handled by authentication or tenant headers, not that path segment.
- The latency `unwrap` examples did not filter pipeline conversion errors. Added `| __error__=""` after `unwrap`, matching Loki's requirement that metric queries cannot contain pipeline errors.
- The Prometheus query snippet mixed a YAML alert rule into a `promql` code block. Replaced it with a valid alert expression example.

## Review Notes
- The examples assume log streams contain JSON fields such as `service`, `endpoint`, `status_code`, and `duration`. In a real deployment, those fields must exist in the logs and parse cleanly, or the queries should include additional pipeline error filters.
- Prometheus can receive remote write data, but its official documentation cautions that this is intended for specific low-volume use cases and is not a replacement for scrape-based ingestion.
