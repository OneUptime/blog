# Validation Summary: How to Monitor Logging Pipeline Health and Backpressure in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Fluent Bit
- Prometheus and Prometheus Operator
- PromQL alerting rules
- Vector
- Grafana Loki and LogQL
- Grafana dashboard JSON

## Sources Consulted
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Fluent Bit metrics input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/fluentbit-metrics
- Fluent Bit buffering and storage documentation: https://docs.fluentbit.io/manual/4.0/administration/buffering-and-storage
- Fluent Bit backpressure documentation: https://docs.fluentbit.io/manual/3.2/administration/backpressure
- Vector internal metrics source documentation: https://vector.dev/docs/reference/configuration/sources/internal_metrics/
- Vector Prometheus exporter sink documentation: https://vector.dev/docs/reference/configuration/sinks/prometheus_exporter/
- Grafana Loki meta-monitoring documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Loki LogQL metric query documentation: https://grafana.com/docs/enterprise-logs/latest/query/metric_queries/
- Grafana Loki log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Kubernetes CronJob API documentation: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found
- The Fluent Bit config enabled filesystem buffering with `storage.type filesystem` but did not set a global `storage.path` or `storage.max_chunks_up`. Added both so filesystem buffering and memory chunk-limit monitoring match Fluent Bit's documented storage model.
- The `prometheus_exporter` output matched `internal_metrics` without defining a `fluentbit_metrics` input. Added the documented `fluentbit_metrics` input that emits internal metrics to the Prometheus exporter output.
- The ServiceMonitor scraped `/api/v1/metrics/prometheus`, while the storage-layer metrics used in the post are documented under the v2 metrics endpoint. Updated the path to `/api/v2/metrics/prometheus`.
- Several Fluent Bit PromQL examples used nonexistent or incorrect metric names: `fluentbit_input_storage_max_chunks_up`, `fluentbit_input_storage_chunks_overlimit`, `fluentbit_output_records_total`, `fluentbit_filter_parser_errors_total`, `fluentbit_input_storage_oldest_chunk_timestamp`, and `fluentbit_input_storage_memory_limit_bytes`. Replaced them with documented storage, output, filter-drop, and latency metrics.
- The backpressure alert attempted to use `increase()` on a timestamp metric that Fluent Bit does not expose. Replaced it with the documented `fluentbit_output_latency_seconds` histogram.
- Vector examples used deprecated or nonexistent metric names such as `vector_buffer_byte_size`, `vector_buffer_max_size`, `vector_lag_time_seconds`, and `vector_memory_used_bytes`. Replaced them with current internal metrics such as `vector_source_buffer_utilization_level`, `vector_source_lag_time_seconds_bucket`, and `vector_utilization`.
- Loki histogram quantile examples did not aggregate buckets by `le`. Updated the examples to use `sum by (le)` over the bucket rates.
- The synthetic LogQL query used `{message="synthetic_check"}` as a stream selector, but `message` is log content in the generated JSON, not necessarily a Loki stream label. Replaced it with a namespace selector and line-content filter.
- The synthetic CronJob used `uuidgen`, which is not guaranteed to be present in minimal BusyBox images. Replaced it with `/proc/sys/kernel/random/uuid`.

## Review Notes
- Fluent Bit's `fluentbit_output_latency_seconds` metric is documented as introduced in Fluent Bit 4.0.6, so older Fluent Bit deployments would need a different latency proxy.
- The PromQL examples assume `storage.max_chunks_up` remains set to `128`; if operators tune that value, the dashboard and alert thresholds should be updated to match.
