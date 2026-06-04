# Validation Summary: Use Loki Ruler to Generate Prometheus Metrics from Kubernetes Log Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Loki Ruler
- LogQL
- Prometheus remote write
- Kubernetes ConfigMaps and StatefulSets
- Grafana dashboards

## Sources Consulted
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki recording rules operations documentation: https://grafana.com/docs/loki/latest/operations/recording-rules/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki metric queries documentation: https://grafana.com/docs/enterprise-logs/latest/query/metric_queries/
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Prometheus HTTP API remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus command-line flags documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/

## Issues Found
- The Loki configuration contained two top-level `ruler` blocks. In YAML, the second block would override the first, dropping the ruler storage, rule path, Alertmanager, ring, and API settings. Merged these into a single `ruler` block.
- The post used the deprecated single-client ruler remote write configuration. Updated it to `remote_write.clients` and retained the same Prometheus endpoint and queue settings.
- The storage example used BoltDB Shipper with schema `v11`, which is not the recommended index store for Loki 2.8 and newer. Updated the example to TSDB with schema `v13`.
- The Prometheus remote write endpoint was shown without mentioning that Prometheus must explicitly enable the receiver. Added the `--web.enable-remote-write-receiver` prerequisite.
- The Kubernetes rule volume mounted rule files directly under `/loki/rules`. Local ruler storage expects tenant-scoped directories, and single-tenant Loki uses the `fake` tenant. Updated the volume to project rule files under `/loki/rules/fake`.
- Several LogQL metric queries parsed JSON or logfmt without filtering parser errors. Loki metric queries fail if pipeline errors remain in the result, so added `| __error__=""` filters after parser stages and after `unwrap` where required.
- Several recording rules used `_total` metric names for one-minute window counts, then queried them as counters with `rate()`. Renamed those recording rules to windowed count names such as `http_requests_count_1m` and updated the Prometheus and Grafana examples.
- The Prometheus example used `histogram_quantile()` on an average response-time series, which is not a histogram bucket series. Replaced it with a direct `http_response_time_avg` query.
- The ruler monitoring examples included metrics that were not aligned with the official ruler recording-rule documentation. Replaced them with documented ruler WAL, remote-write failure, lag, and repair-failure metrics.

## Review Notes
The examples still assume log streams have labels such as `job`, `namespace`, `pod`, `app`, and `level`, and that application logs expose the JSON or logfmt fields used in the LogQL expressions. In a real cluster, those labels and fields depend on the log collector pipeline and application log format.
