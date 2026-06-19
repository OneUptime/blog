# Validation Summary: How to Handle RabbitMQ Consumer Prefetch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1 basic.qos / consumer prefetch
- Pika Python client
- rabbitmqctl
- RabbitMQ Management HTTP API
- RabbitMQ Prometheus metrics
- PromQL
- Python

## Sources Consulted
- RabbitMQ Consumer Prefetch documentation: https://www.rabbitmq.com/docs/consumer-prefetch
- RabbitMQ Consumer Acknowledgements and Publisher Confirms documentation: https://www.rabbitmq.com/docs/confirms
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Monitoring documentation: https://www.rabbitmq.com/docs/monitoring
- RabbitMQ Prometheus and Grafana documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Prometheus metrics reference: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- Pika channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html
- Pika BlockingConnection documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html

## Issues Found
- Several Python examples used modules without importing them. Added `time` to the first consumer example, `random` to the heavy worker example, and replaced the unused `os` import in the multi-worker example with `random` and `time`.
- The high-throughput batch consumer could leave a partial batch unacknowledged indefinitely. Added a short timeout flush using `BlockingConnection.call_later`.
- The adaptive prefetch example called `channel.basic_qos` indirectly from a background thread. Pika documents `BlockingConnection.add_callback_threadsafe` as the thread-safe way to schedule work on the connection thread, so the adjustment loop now schedules `adjust_prefetch` through that method.
- The batch consumer claimed to flush on timeout, but only checked the timeout when a new message arrived. Added a scheduled timeout callback so partial batches are flushed even when no further messages arrive.
- The `rabbitmqctl list_consumers` example incorrectly passed column names. Updated it to the supported `rabbitmqctl list_consumers` command.
- The `rabbitmqctl list_channels` example used `unacked_message_count`, which is not a valid channel info item. Updated it to `messages_unacknowledged`.
- The Prometheus examples used outdated or incorrect metric names and a misleading utilization formula. Updated `rabbitmq_channel_messages_unacknowledged` to `rabbitmq_channel_messages_unacked` and replaced the formula with RabbitMQ's `rabbitmq_queue_consumer_utilisation` metric.

## Review Notes
RabbitMQ 4.3 documentation confirms that RabbitMQ applies `prefetch_count` separately to each new consumer by default, while `global_qos=True` shares a channel-level limit. Pika's `basic_qos(prefetch_count=..., global_qos=...)` API remains current. The benchmark examples assume the benchmark queue is already populated; that is acceptable for a focused prefetch article but could be called out in a future revision.
