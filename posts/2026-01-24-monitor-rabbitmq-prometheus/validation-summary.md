# Validation Summary: How to Monitor RabbitMQ with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ
- RabbitMQ Prometheus plugin
- Prometheus
- PromQL
- Alertmanager
- Grafana
- Docker Compose
- Kubernetes service discovery
- Python
- Pika
- prometheus_client

## Sources Consulted
- RabbitMQ Prometheus and Grafana documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Prometheus metric reference: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- RabbitMQ memory alarm documentation: https://www.rabbitmq.com/docs/memory
- RabbitMQ consumer acknowledgements and publisher confirms documentation: https://www.rabbitmq.com/docs/confirms
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Pika channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html

## Issues Found
- The configuration-file section incorrectly described RabbitMQ plugin configuration as enabling the plugin. Changed the wording to say it configures Prometheus metrics; the plugin still needs to be enabled separately.
- The `/metrics/detailed` example omitted required query parameters. Updated it to request specific metric families, matching RabbitMQ's documented behavior.
- The Docker Compose RabbitMQ command enabled the plugin before starting RabbitMQ without offline mode. Updated it to use `rabbitmq-plugins enable --offline rabbitmq_prometheus`.
- Several metric names in examples were not RabbitMQ Prometheus metrics: `rabbitmq_queue_messages_delivered_total`, `rabbitmq_queue_messages_acknowledged_total`, `rabbitmq_queue_messages_redelivered_total`, `rabbitmq_alarms_memory_used_watermark`, `rabbitmq_alarms_free_disk_space_watermark`, and `rabbitmq_connections_state`. Replaced them with documented RabbitMQ metrics or equivalent threshold expressions.
- Some PromQL used `rate()` on `rabbitmq_queue_messages`, which is a gauge. Replaced those calculations with `deriv()` for queue-depth growth.
- One alert used invalid PromQL aggregation syntax. Updated it to `sum by (instance) (...)`.
- The "blocked connections" alert depended on a non-existent connection-state metric. Reframed it as a publisher-blocking risk based on RabbitMQ memory and disk alarm thresholds.
- The Grafana dashboard used legacy `graph` panels. Updated them to current `timeseries` panels.
- The Prometheus retention example showed storage retention under `prometheus.yml`, but Prometheus documents those as command-line flags. Replaced the YAML with startup flags.
- The connection distribution query used invalid PromQL syntax. Updated it to `sum by (instance) (rabbitmq_connections)`.

## Review Notes
- The corrected alert and recording rule snippets were validated with `promtool` from `prom/prometheus:v2.47.0`.
- The Grafana dashboard JSON, standalone YAML snippets, and Python code blocks were parsed locally for syntax.
- The post intentionally enables per-object metrics via `prometheus.return_per_object_metrics = true`; this is correct but RabbitMQ documents that it can be expensive in large deployments.
