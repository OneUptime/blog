# Validation Summary: How to Build Loki Custom Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Loki ruler
- LogQL
- Alertmanager
- Prometheus remote write
- Kubernetes ConfigMaps and Deployments
- YAML configuration

## Sources Consulted
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki LogQL metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki LogQL query reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Prometheus command-line flag reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus storage documentation for remote write receiver endpoint: https://prometheus.io/docs/prometheus/latest/storage/

## Issues Found
- The Loki configuration used the deprecated `ruler.storage` block. Changed it to the current top-level `ruler_storage` block with `backend: local`.
- The Loki recording-rule remote-write configuration used the deprecated singular `remote_write.client` field. Changed it to `remote_write.clients` with a named `prometheus` client.
- The Prometheus command used the deprecated `--enable-feature=remote-write-receiver` flag. Changed it to the current `--web.enable-remote-write-receiver` flag.
- The Rules API section implied dynamic rule management works with local ruler storage. Clarified that local storage is read-only for rule create/delete operations and that dynamic management requires an object storage backend.
- The Rules API POST example sent a Prometheus-style file containing `groups`, but Loki's set-rule-group endpoint expects a single rule group object. Updated the request body to use `name` and `rules` at the top level.
- The crash-loop LogQL example used `count_over_time(...) by (app)`, which is not the correct grouping form for a log range aggregation. Wrapped it in `sum by (app) (...)`.
- The latency percentile `unwrap` examples did not filter pipeline/conversion errors. Added `| __error__=""` after `unwrap`, matching Loki's documented pattern for metric queries using unwrap.

## Review Notes
The remaining examples are syntactically consistent with Loki's documented rule file format, LogQL metric query patterns, Kubernetes ConfigMap mounting, and Loki ruler API endpoints. The JSON parsing examples assume the selected log streams contain JSON fields with the expected names and numeric values.
