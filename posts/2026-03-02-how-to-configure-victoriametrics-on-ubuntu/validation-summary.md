# Validation Summary: How to Configure VictoriaMetrics on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- VictoriaMetrics single-node
- systemd
- Prometheus remote_write
- Prometheus-compatible HTTP APIs
- MetricsQL / PromQL
- Grafana Prometheus data source

## Sources Consulted
- VictoriaMetrics single-node documentation: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/
- VictoriaMetrics quick start: https://docs.victoriametrics.com/victoriametrics/quick-start/
- VictoriaMetrics API examples: https://docs.victoriametrics.com/url-examples/
- VictoriaMetrics MetricsQL documentation: https://docs.victoriametrics.com/metricsql/
- VictoriaMetrics GitHub release API for v1.143.0: https://api.github.com/repos/VictoriaMetrics/VictoriaMetrics/releases/tags/v1.143.0
- Prometheus remote write tuning: https://prometheus.io/docs/practices/remote_write/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Local verification with the official VictoriaMetrics v1.143.0 binary and `--help` output.

## Issues Found
- The install snippet described the download as the latest binary but pinned `v1.96.0`, which is no longer current. Updated the pinned version to `v1.143.0`, verified as the latest GitHub release on 2026-05-19 and confirmed the release asset URL exists.
- The systemd example used `-loggerOutput=/var/log/victoria-metrics/victoria-metrics.log`. VictoriaMetrics only accepts `stderr` or `stdout` for `-loggerOutput`, so that command panics at startup. Changed it to `-loggerOutput=stdout` and added systemd `StandardOutput` / `StandardError` append directives to keep the intended log file behavior.
- The key-parameters snippet used `-maxScrapeSize`, which is not a VictoriaMetrics single-node flag. Changed it to the documented `-promscrape.maxScrapeSize` flag and clarified that it applies when using VictoriaMetrics scraping.
- The high-ingest tuning snippet recommended `-smallMergeConcurrency` and `-bigMergeConcurrency`, but both are deprecated and do nothing in current VictoriaMetrics. Removed those lines.
- The self-monitoring metric list included `vm_rows_ingested_total` and `vm_queries_total`, which are not exposed by the current single-node binary. Replaced them with current metrics: `vm_rows_inserted_total` and `vm_http_requests_total{path="/api/v1/query"}`.

## Review Notes
The Prometheus `remote_write` configuration fields and VictoriaMetrics `/api/v1/write`, query, query_range, label-values, and series-count endpoints are valid. The MetricsQL examples are syntactically valid. The `-inmemoryDataFlushInterval=5s` tuning example is technically valid, but VictoriaMetrics documentation notes that very short flush intervals may significantly increase disk I/O, so it should be adjusted carefully in production.
