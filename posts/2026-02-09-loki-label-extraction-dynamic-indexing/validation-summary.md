# Validation Summary: How to Use Loki Label Extraction from Log Lines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Promtail pipeline stages
- Kubernetes log collection
- JSON, regex, and logfmt log parsing
- Node.js / Winston test logging

## Sources Consulted
- Grafana Loki LogQL log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric queries documentation: https://grafana.com/docs/enterprise-logs/latest/query/metric_queries/
- Grafana Loki labels documentation: https://grafana.com/docs/loki/latest/get-started/labels/
- Grafana Loki send data documentation: https://grafana.com/docs/loki/latest/send-data/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki / Promtail JSON stage documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/promtail/stages/json/
- Grafana Loki / Promtail labeldrop stage documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/promtail/stages/labeldrop/
- Grafana Alloy loki.process stage documentation, used to cross-check current stage behavior and Promtail migration guidance: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/loki/loki.process/

## Issues Found
- The post described query-time extraction as creating dynamic indexes without changing collectors. Loki only indexes ingestion labels; LogQL parser labels are query-time fields and do not update the index. Updated the description and architecture wording to distinguish ingestion-time indexed labels from query-time parsed fields.
- The Promtail section did not mention that Promtail reached end-of-life on March 2, 2026. Added a caveat to use Grafana Alloy for new deployments and Promtail only for existing Promtail installations.
- The Kubernetes Promtail scrape example did not set `__path__`, so pod discovery alone would not identify container log files to tail. Added a `__path__` relabel rule based on pod UID and container name.
- The cardinality-management example used an `output` stage with `source: message` without extracting `message`, which would not work as shown and was unnecessary for keeping parsed high-cardinality fields out of labels. Removed that invalid output stage.
- The derived-label template example used a `match` selector on `level` without first extracting and promoting `level` to a label in that snippet. Added `level` extraction and a labels stage before the `match`.
- The Kubernetes metadata example reversed the labels-stage mapping for namespace. Changed it to set the `namespace` label from the extracted `k8s_namespace` value.
- The LogQL cardinality examples used unsupported `stats count() by ...` syntax for Loki. Replaced them with supported `count_over_time` metric queries grouped by parsed labels.

## Review Notes
The remaining examples are illustrative snippets rather than complete production manifests. Future updates should consider showing Grafana Alloy configuration first because Grafana documents Alloy as the recommended collector path for new Loki deployments.
