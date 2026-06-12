# Validation Summary: How to Configure Memory and Disk Alarms in RabbitMQ

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- RabbitMQ memory alarms and disk alarms
- RabbitMQ configuration (`rabbitmq.conf`)
- RabbitMQ Management HTTP API
- RabbitMQ Prometheus metrics
- Pika Python client
- amqplib Node.js client
- Prometheus alerting rules

## Sources Consulted
- RabbitMQ Memory Alarm Threshold documentation: https://www.rabbitmq.com/docs/memory
- RabbitMQ Free Disk Space Alarms documentation: https://www.rabbitmq.com/docs/disk-alarms
- RabbitMQ Configuration documentation: https://www.rabbitmq.com/docs/configure
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Prometheus and Grafana documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Classic Lazy Queues historical reference: https://www.rabbitmq.com/docs/lazy-queues
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Persistence Configuration documentation: https://www.rabbitmq.com/docs/persistence-conf
- RabbitMQ Queue Length Limit documentation: https://www.rabbitmq.com/docs/maxlength
- RabbitMQ Blocked Connection Notifications documentation: https://www.rabbitmq.com/docs/connection-blocked
- Pika BlockingConnection documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Pika heartbeat and blocked connection timeout example: https://pika.readthedocs.io/en/stable/examples/heartbeat_and_blocked_timeouts.html
- amqplib Channel API documentation: https://amqp-node.github.io/amqplib/channel_api.html

## Issues Found
- The memory threshold section said the RabbitMQ default memory high watermark is 40%. Current RabbitMQ documentation states the default is 60%, so the comment was corrected.
- The memory paging threshold section used `vm_memory_high_watermark_paging_ratio`, which is not part of current RabbitMQ configuration documentation. It was replaced with current classic queue storage behavior and high watermark guidance.
- The disk relative limit section said the default is 1.0x RAM. Current RabbitMQ documentation states the default disk free limit is an absolute 50MB, and recommends absolute limits for production. The misleading default claim was removed.
- The Management API example tried to infer alarms from `/api/overview` listener data. Current RabbitMQ provides `/api/health/checks/alarms` and per-node alarm fields from `/api/nodes`, so the overview alarm scan was replaced with the health check.
- The lazy queue section recommended `x-queue-mode: lazy`. Current RabbitMQ no longer supports lazy mode and ignores that argument in RabbitMQ 3.12 and later, so the example was updated to describe current classic queue behavior.
- The quorum queue section used `x-max-in-memory-length` and `x-max-in-memory-bytes`, which are obsolete for modern quorum queues. It was updated to show `raft.wal_max_size_bytes`, the current storage-related memory tuning option documented for quorum queues.
- The container configuration section suggested `vm_memory_calculation_strategy = allocated` as Kubernetes/Docker-specific guidance. Current documentation recommends absolute memory thresholds or `total_memory_available_override_value` when RabbitMQ cannot infer container limits, so the snippet was corrected.
- The memory breakdown API example used `jq '.[].memory'` against `/api/nodes`, which is not the documented memory breakdown endpoint. It was replaced with `rabbitmq-diagnostics memory_breakdown`.

## Review Notes
The remaining examples are broadly accurate for current RabbitMQ usage. Prometheus metric names for memory and disk alarms are present in RabbitMQ's Prometheus metrics ecosystem, but dashboard and alerting labels can vary by deployment and scrape endpoint. Production deployments should validate alert expressions against their own scraped metric labels.
