# Validation Summary: How to Fix 'Consumer Cancelled' Errors in RabbitMQ

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1 consumers
- RabbitMQ CLI and Management HTTP API
- Node.js with amqplib
- Python with pika
- Queue deletion, auto-delete queues, exclusive queues, and replicated queue failover

## Sources Consulted
- RabbitMQ Consumer Cancel Notification: https://www.rabbitmq.com/docs/consumer-cancel
- RabbitMQ Consumers: https://www.rabbitmq.com/docs/consumers
- RabbitMQ Queues: https://www.rabbitmq.com/docs/queues
- RabbitMQ Classic Queue Mirroring, RabbitMQ 3.13 historical documentation: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/next/http-api-reference
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- amqplib Channel API: https://amqp-node.github.io/amqplib/channel_api.html
- pika Channel API: https://pika.readthedocs.io/en/stable/modules/channel.html

## Issues Found
- The Node.js examples used `channel.on('cancel')` with amqplib. amqplib documents server-side consumer cancellation by invoking the consume callback with `null`, not by emitting a channel `cancel` event. Removed those event handlers and moved cancellation recovery into the `msg === null` branch.
- The post described queue policy changes as a way to change queue type and showed an `ha-mode` policy. RabbitMQ queue type cannot be changed dynamically by policy, and classic mirrored queue HA policies were removed in RabbitMQ 4.0. Replaced this with queue recreation wording and a deletion example.
- The post referred broadly to HA queue failover and mirrored queues without a version caveat. Updated wording to replicated queue failover, noted that classic mirrored queues are RabbitMQ 3.x historical behavior, and stated that quorum queues or streams should be used for new replicated workloads.
- The Python pika example used `x-cancel-on-ha-failover` in the general cancellation example with comments implying it enabled all cancellation notifications. Removed it from the general example and kept it only in the mirrored-classic failover example where RabbitMQ documents that argument.
- The pika cancel callback registration appeared after `basic_consume`, leaving a possible race before callback registration. Moved callback registration before `basic_consume` in both Python examples.

## Review Notes
The monitoring example is suitable as a lightweight illustrative check, but production monitoring should also check command exit codes and parse errors. The RabbitMQ HTTP API queue listing examples in official docs recommend pagination for large deployments; the post's direct queue DELETE example is still a valid endpoint for a single queue.
