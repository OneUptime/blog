# Validation Summary: How to Handle RabbitMQ Memory Issues

## Status
validated

## Post Type
Technical Guide / Tutorial

## Technologies Covered
- RabbitMQ (message broker, configuration, CLI, management API, Prometheus plugin)
- rabbitmqctl CLI
- RabbitMQ Management HTTP API
- Python 3 with the `pika` AMQP 0-9-1 client library
- Lazy queues, Quorum queues
- Dead-letter exchanges (DLX), Message TTL, queue overflow policies
- Prometheus / Grafana (scrape config, alerting rules, PromQL)
- Bash / curl / jq

## Sources Consulted
- RabbitMQ Memory Use docs: https://www.rabbitmq.com/docs/memory-use
- RabbitMQ Memory Alarms / Flow Control: https://www.rabbitmq.com/docs/memory and https://www.rabbitmq.com/docs/alarms
- RabbitMQ `rabbitmqctl` reference: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Lazy Queues: https://www.rabbitmq.com/docs/lazy-queues
- RabbitMQ Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Management HTTP API: https://www.rabbitmq.com/docs/management
- RabbitMQ Prometheus plugin: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ TTL: https://www.rabbitmq.com/docs/ttl
- Dead Letter Exchanges: https://www.rabbitmq.com/docs/dlx
- pika 1.x Channel reference: https://pika.readthedocs.io/en/stable/modules/channel.html
- Prometheus alerting rules reference: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found

1. **Invalid `--sort-by` flag on `rabbitmqctl list_queues`.** The post used `rabbitmqctl list_queues ... --sort-by=memory` and `--sort-by=messages`. `rabbitmqctl list_queues` does not support a `--sort-by` option (it accepts column names as positional arguments plus options like `--no-table-headers`, `--vhost`, `--online`, etc.). I replaced both invocations with a shell-side sort using `--no-table-headers | sort -k<col> -n -r`, which is the standard idiom and produces the intended ordering.

No other technical inaccuracies were identified. The Python `pika` code (including `global_qos=False` for `basic_qos`, `multiple=True` for batch acks, `arguments={...}` for queue declarations), the management API field names (`mem_used`, `mem_limit`, `mem_alarm`), the configuration keys (`vm_memory_high_watermark.relative`, `vm_memory_high_watermark.absolute`, `vm_memory_high_watermark_paging_ratio`), the queue arguments (`x-queue-mode`, `x-queue-type`, `x-message-ttl`, `x-max-length`, `x-overflow`, `x-dead-letter-exchange`, `x-dead-letter-routing-key`, `x-max-in-memory-length`, `x-max-in-memory-bytes`), the Prometheus port (15692) and metric names (`rabbitmq_process_resident_memory_bytes`, `rabbitmq_resident_memory_limit_bytes`, `rabbitmq_alarms_memory_used_watermark`), and the URL-encoded vhost path (`%2F`) in the management API DELETE call are all correct.

## Review Notes

- **Lazy queue mode deprecation:** `x-queue-mode: lazy` (classic queue mode) was deprecated in RabbitMQ 3.12 and the lazy mode setting is effectively a no-op / removed in RabbitMQ 4.0+, where classic queues use a unified version-2 behaviour that already pages aggressively. The syntax shown remains accepted (it is silently ignored on 4.x) and is correct for 3.x clusters, but readers on 4.0+ should be aware the argument no longer has an effect.
- **Quorum queue in-memory limits:** `x-max-in-memory-length` and `x-max-in-memory-bytes` were deprecated in newer RabbitMQ releases in favour of quorum queues' new memory-management model and may be ignored on RabbitMQ 4.0+. The arguments are still accepted in declarations and the syntax shown is correct.
- **`global_qos` parameter:** This is correct for pika 1.x (current); older pika 0.x used `all_channels`. If a reader is pinned to pika 0.x, the call signature will differ.
- **Management API auth:** The examples use the default `guest:guest` credentials, which by default only work from localhost. Worth keeping in mind for any production deployment.
- **`vm_memory_high_watermark_paging_ratio`** is correctly named but is a classic-queue concept; in RabbitMQ 4.0+ classic queues no longer use the paging ratio in the same way.
