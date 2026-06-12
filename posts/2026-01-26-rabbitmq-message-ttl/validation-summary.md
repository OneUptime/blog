# Validation Summary: How to Implement Message TTL in RabbitMQ

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1
- Pika for Python
- amqplib for Node.js
- rabbitmqctl
- Prometheus

## Sources Consulted
- RabbitMQ Time-to-Live and Expiration documentation: https://www.rabbitmq.com/docs/ttl
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Prometheus documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Prometheus plugin metric list: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- Pika API documentation: https://pika.readthedocs.io/en/stable/

## Issues Found
- The per-message TTL caveat said messages only expire at the queue head. RabbitMQ treats messages as expired after their TTL for delivery purposes, but removes or dead-letters expired messages when they reach the queue head. Updated the wording to distinguish expiration from removal/dead-lettering and queue statistics.
- The zero-TTL example said the message expires immediately if the queue is empty. RabbitMQ expires TTL 0 messages unless they can be delivered to a consumer immediately. Updated the explanation and code comment.
- The dead-letter queue monitor accepted `user` and `password` parameters but did not use them. Updated the Pika connection setup to use `pika.PlainCredentials`.
- The Prometheus alert used `rabbitmq_queue_messages_expired_total`, which is not listed in the current RabbitMQ Prometheus plugin metric list. Replaced it with `rabbitmq_global_messages_dead_lettered_expired_total`.

## Review Notes
The RabbitMQ TTL policy syntax, `x-message-ttl` queue argument, per-message `expiration` property, lower-TTL-wins behavior, DLX arguments, `x-death` reason handling, and delayed-delivery/retry patterns are consistent with RabbitMQ's current documentation. The post uses hardcoded queue `x-arguments` for tutorial examples; RabbitMQ's documentation recommends policies for operational flexibility, which the post already demonstrates for TTL.
