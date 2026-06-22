# Validation Summary: How to Fix 'Resource Locked' Errors in RabbitMQ

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1
- Pika Python client
- rabbitmqctl
- RabbitMQ Management HTTP API
- Prometheus alerting

## Sources Consulted
- RabbitMQ Queues documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ Consumers documentation: https://www.rabbitmq.com/docs/consumers
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Prometheus documentation: https://www.rabbitmq.com/docs/prometheus
- AMQP 0-9-1 reference: https://github.com/rabbitmq/amqp-0.9.1-spec/blob/main/docs/amqp-0-9-1-reference.md
- Pika channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html

## Issues Found
- The consumer tag section incorrectly implied duplicate consumer tags are a `RESOURCE_LOCKED` cause and that tags are unique per queue. Updated it to explain that duplicate tags are a separate consumer registration error scoped to a channel, and changed the example to catch `pika.exceptions.DuplicateConsumerTag`.
- The Single Active Consumer description said only one consumer is allowed. Updated it to say multiple consumers can register, but only one receives messages at a time.
- `rabbitmqctl list_consumers` examples used unsupported column arguments. Replaced them with the current `rabbitmqctl list_consumers` form and used `rabbitmqctl list_queues` fields for exclusive consumer details.
- The queue sample output used `none` for a non-exclusive queue owner. RabbitMQ documents `owner_pid` as empty for non-exclusive queues, so the sample was corrected.
- The connection diagnostic command did not include `pid`, which is needed to match a queue `owner_pid` to a connection. Added `pid` and updated the comment.
- The exclusive queue factory stored only channels and closed a channel during release. Exclusive queue ownership is tied to the connection, so the example now stores and closes the owning connection. It also avoids yielding while holding the internal lock.
- The RPC client used `time.time()` without importing `time`. Added the missing import.
- The Prometheus alert used a non-standard built-in RabbitMQ metric and reason label. Replaced it with a clearly custom/log-pipeline metric and noted that the built-in RabbitMQ Prometheus plugin does not expose `RESOURCE_LOCKED` as a standard reason label.
- The `auto_delete=True` comment incorrectly said it cleaned up when the connection closes. Updated it to describe auto-delete behavior without confusing it with exclusive queue connection cleanup.

## Review Notes
Python examples were syntax-checked with `python3` by compiling all fenced Python blocks. They were not executed against a live RabbitMQ broker in this environment.
