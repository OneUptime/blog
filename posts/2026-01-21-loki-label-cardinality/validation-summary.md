# Validation Summary: How to Optimize Loki Label Cardinality

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Promtail
- Grafana Alloy
- LogQL
- Prometheus/PromQL
- Loki HTTP API
- Loki configuration and runtime overrides
- Grafana dashboards and alerting rules

## Sources Consulted
- Grafana Loki label documentation: https://grafana.com/docs/loki/latest/get-started/labels/
- Grafana Loki structured metadata documentation: https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki LogQL query documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki request validation and rate limits: https://grafana.com/docs/loki/latest/operations/request-validation-rate-limits/
- Grafana Loki ingestion troubleshooting: https://grafana.com/docs/loki/latest/operations/troubleshooting/troubleshoot-ingest/
- Grafana Loki key metrics documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/metrics/
- Promtail labels stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Promtail labeldrop stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labeldrop/
- Promtail structured_metadata stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/structured_metadata/
- Promtail template stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/template/
- Grafana Loki 2.9 release notes: https://grafana.com/docs/loki/latest/release-notes/v2-9/
- Grafana Loki 3.0 release notes: https://grafana.com/docs/loki/latest/release-notes/v3-0/

## Issues Found
- The stream-count command queried `/loki/api/v1/label/__name__/values`, which returns values for a label rather than a stream count and is a Prometheus metric convention, not a reliable Loki log stream count. Changed it to use `/loki/api/v1/index/stats` with a selector and read `.streams`.
- The active-stream metric check grepped for `loki_ingester_streams_created_total`, which is a creation counter, not the active in-memory stream gauge. Changed it to `loki_ingester_memory_streams`.
- The post stated timestamps are already indexed by Loki. Loki indexes labels and stores timestamps with log entries, so the wording was corrected.
- The post described structured metadata as a Loki 2.7+ feature. Official release notes say structured metadata was introduced experimentally in Loki 2.9.0 and became generally available in 2.9.4, so the version note was corrected to Loki 2.9+.
- The structured metadata section said structured metadata is indexed. Official docs describe it as metadata attached without indexing and without creating streams, so the query comment was corrected.
- The Loki limits example included `max_labels_size_bytes`, which is not a current Loki `limits_config` field in the official configuration reference. Removed that setting.
- The alert and dashboard examples used `reason="per_user_series_limit"` for stream-limit drops. Current Loki docs use `reason="stream_limit"`, so both expressions were corrected.
- The migration command comment said the `/labels` endpoint finds the highest-cardinality labels. That endpoint lists known labels; it does not rank by cardinality. The comment was corrected.
- Promtail is now end-of-life as of March 2, 2026. Added a short caveat that the Promtail snippets apply to existing deployments and that Grafana Alloy should be used for new deployments.

## Review Notes
The remaining examples are technically plausible for existing Promtail and Loki deployments, but new production guidance should eventually show Grafana Alloy equivalents because Promtail has reached end-of-life.
