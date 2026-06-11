# Validation Summary: How to Create Saturation Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus / node_exporter (CPU, memory, disk metrics)
- Kafka (via danielqsj/kafka_exporter)
- RabbitMQ (Prometheus plugin)
- Sidekiq (job queue metrics)
- PostgreSQL (postgres_exporter)
- Tomcat / Jetty thread pool metrics
- Node.js (prom-client metrics)
- Java ExecutorService metrics
- OpenTelemetry Python SDK (Observable Gauges)
- OpenTelemetry JavaScript SDK (Observable Gauges)
- Google SRE Four Golden Signals

## Sources Consulted
- Google SRE Book — Monitoring Distributed Systems (Four Golden Signals): https://sre.google/sre-book/monitoring-distributed-systems/
- prometheus/node_exporter README: https://github.com/prometheus/node_exporter
- danielqsj/kafka_exporter (metric names): https://github.com/danielqsj/kafka_exporter
- RabbitMQ Prometheus plugin docs: https://www.rabbitmq.com/docs/prometheus
- rabbitmq/rabbitmq-prometheus: https://github.com/rabbitmq/rabbitmq-prometheus
- prometheus-community/postgres_exporter: https://github.com/prometheus-community/postgres_exporter
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry JavaScript metrics API: https://opentelemetry.io/docs/languages/js/instrumentation/
- prom-client (Node.js default metrics): https://github.com/siimon/prom-client

## Issues Found

1. **Kafka metric names (incorrect)** — The post used `kafka_consumer_group_lag` and `kafka_consumer_group_offset`. The danielqsj/kafka_exporter actually exports these as `kafka_consumergroup_lag` and `kafka_consumergroup_current_offset` (no underscore between "consumer" and "group", and the offset metric is suffixed `current_offset`). Fixed both in the Kafka example block.

2. **RabbitMQ metric spelling** — The post used `rabbitmq_queue_consumer_utilization` (American spelling). The official RabbitMQ Prometheus plugin uses the British spelling `rabbitmq_queue_consumer_utilisation`. Updated both the metric name and the corresponding comment.

3. **OpenTelemetry Python `create_observable_gauge` callback signature** — The post used `callbacks=[lambda: get_pool_utilization()]`. This will not work as written: per the OpenTelemetry Python SDK, each callback must accept a `CallbackOptions` argument and return (or yield) an `Iterable[Observation]`. Replaced the three lambdas with properly typed callback functions that yield `Observation` instances, and added the necessary imports (`CallbackOptions`, `Observation`, `Iterable`).

## Review Notes

- The CPU/memory/disk Prometheus queries against node_exporter are correct and use current (non-deprecated) metric names (`node_cpu_seconds_total`, `node_memory_MemTotal_bytes`, `node_memory_MemAvailable_bytes`, `node_vmstat_pgmajfault`, `node_disk_io_time_seconds_total`, `node_disk_io_time_weighted_seconds_total`).
- The disk queue depth formula `rate(node_disk_io_time_weighted_seconds_total[5m]) / rate(node_disk_io_time_seconds_total[5m])` is a commonly-used "average queue depth while the disk is busy" approximation; some operators prefer just `rate(node_disk_io_time_weighted_seconds_total[5m])` for overall avgqu-sz. Both are in use; left as written.
- Tomcat/Jetty, Sidekiq, and ExecutorService metric names in the post are illustrative — exact names vary by exporter (Micrometer vs jmx_exporter vs sidekiq-prometheus-exporter vs strafe/sidekiq-prometheus, etc.). Left as written since the post does not claim a specific exporter.
- The OpenTelemetry JavaScript example is correct: `createObservableGauge` returns an `ObservableGauge` whose `addCallback` accepts a callback receiving an `ObservableResult` with an `observe(value, attributes)` method.
- Node.js prom-client metric names (`nodejs_eventloop_lag_seconds`, `nodejs_active_handles`, `nodejs_active_requests`) match the defaults exported by `prom-client`.
- Four Golden Signals reference and the SRE book citation are accurate.
