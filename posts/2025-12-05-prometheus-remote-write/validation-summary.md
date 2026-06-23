# Validation Summary: How to Configure Remote Write in Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus remote write
- Prometheus remote write queue configuration
- PromQL
- Alerting rules
- Thanos Receive
- Cortex
- Grafana Mimir
- VictoriaMetrics
- Grafana Cloud Metrics
- Amazon Managed Service for Prometheus
- Kubernetes Secrets

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning documentation: https://prometheus.io/docs/practices/remote_write/
- Prometheus remote write implementation metrics in official source: https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go
- Thanos Receive documentation: https://thanos.io/tip/components/receive.md/
- Grafana Cloud Prometheus metrics remote write documentation: https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/
- Grafana Mimir HTTP API documentation: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir authentication documentation: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Cortex HTTP API documentation: https://cortexmetrics.io/docs/api/
- VictoriaMetrics Prometheus integration documentation: https://docs.victoriametrics.com/victoriametrics/integrations/prometheus/
- Amazon Managed Service for Prometheus ingestion documentation: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-ingest-metrics-existing-Prometheus.html

## Issues Found
- Several Prometheus remote write self-metric names used older or incorrect forms. Updated `prometheus_remote_storage_pending_samples`, `prometheus_remote_storage_succeeded_samples_total`, `prometheus_remote_storage_failed_samples_total`, `prometheus_remote_storage_dropped_samples_total`, and `prometheus_remote_storage_sent_bytes_total` to the current metric names.
- The queue utilization query divided pending samples by `prometheus_remote_storage_samples_total`, which is a counter of sent samples, not queue capacity. Changed it to divide by `prometheus_remote_storage_shards * prometheus_remote_storage_shard_capacity`.
- The Grafana Cloud example used a hard-coded regional endpoint. Changed it to a placeholder endpoint ending in `/api/prom/push`, matching Grafana Cloud's instance-specific remote write guidance.
- The WAL buffering example included `out_of_order_time_window`, which is not a remote write buffering setting. Removed it from that snippet.

## Review Notes
The main Prometheus `remote_write` configuration fields, queue options, write relabeling, `retry_on_http_429`, TLS, proxy, SigV4, Cortex/Mimir `X-Scope-OrgID`, Thanos Receive, VictoriaMetrics, and AWS Managed Service for Prometheus examples match current official documentation. `promtool` was not available in the local environment, so config and rule syntax were reviewed manually rather than with local CLI validation.
