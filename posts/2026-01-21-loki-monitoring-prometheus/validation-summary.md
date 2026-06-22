# Validation Summary: How to Monitor Loki with Prometheus and Grafana

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Prometheus
- PromQL
- Grafana dashboards
- Prometheus alerting rules
- Prometheus Operator ServiceMonitor
- Kubernetes service discovery

## Sources Consulted
- Grafana Loki meta-monitoring documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/
- Grafana Loki key metrics documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/metrics/
- Grafana Loki mixin documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/mixins/
- Grafana Loki source and compiled mixins: https://github.com/grafana/loki
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- Replaced outdated or incorrect Loki metric names with current documented/source-backed metrics: `loki_ingester_wal_bytes_total` to `loki_ingester_wal_logged_bytes_total`, `loki_chunk_store_chunks_stored_total` to `loki_chunk_store_stored_chunks_total`, and `loki_compactor_running` to `loki_boltdb_shipper_compactor_running`.
- Replaced unsupported storage and compactor examples with current Loki metrics: `loki_boltdb_shipper_uploads_total` became `loki_boltdb_shipper_compact_tables_operation_total`, and `loki_chunk_store_errors_total` became `loki_objstore_bucket_operation_failures_total`.
- Replaced rate-limit/drop examples using `loki_distributor_lines_dropped_total` and a non-current ingestion-limit metric with `loki_discarded_samples_total`, which is the documented Loki metric for rejected or discarded samples.
- Updated the alert for discarded samples and the related section heading so the alert name and wording match the corrected metric.
- Replaced unsupported performance/cache examples with current Loki metrics: `loki_querier_split_queries_bucket` became `loki_query_frontend_queries_in_progress`, and query frontend cache hit/miss metrics became `loki_query_frontend_log_result_cache_hit_total` and `loki_query_frontend_log_result_cache_miss_total`.
- Replaced the retention effectiveness example with `loki_compactor_apply_retention_operation_total`, a current compactor retention metric.

## Review Notes
The Prometheus scrape configuration, ServiceMonitor shape, alerting rule structure, PromQL histogram queries, and Grafana dashboard JSON structure are technically valid. Some example thresholds, labels, ports, and service names remain deployment-specific and may need adjustment for a particular Loki Helm chart or custom deployment.
