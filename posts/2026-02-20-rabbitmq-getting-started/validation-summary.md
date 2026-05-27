# Validation Summary: How to Get Started with RabbitMQ for Message Queuing

## Status
validated

## Post Type
Tutorial / Beginner Guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1
- RabbitMQ exchanges, queues, bindings, and virtual hosts
- RabbitMQ Docker image with management plugin
- Python
- Pika Python client
- OpenTelemetry
- OneUptime

## Sources Consulted
- RabbitMQ AMQP 0-9-1 model guide: https://www.rabbitmq.com/tutorials/amqp-concepts
- RabbitMQ queues documentation: https://www.rabbitmq.com/docs/4.2/queues
- RabbitMQ virtual hosts documentation: https://www.rabbitmq.com/docs/3.13/vhosts
- RabbitMQ Python work queues tutorial: https://www.rabbitmq.com/tutorials/tutorial-two-python
- Docker Official Image for RabbitMQ: https://hub.docker.com/_/rabbitmq
- Pika channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html
- Pika BasicProperties documentation: https://pika.readthedocs.io/en/stable/modules/spec.html#pika.spec.BasicProperties

## Issues Found

1. **Outdated Docker image tag**: The Docker command used `rabbitmq:3.13-management`, but the current Docker Official Image page lists RabbitMQ 4.x tags as supported. Changed the example to `rabbitmq:4-management`.

2. **Consumer example would fail at runtime**: The consumer callback called `save_to_database(order)`, but that function was not defined anywhere in the tutorial. Replaced it with a `print` statement so the beginner example can run as shown.

3. **Durability wording was too strong**: The message flow diagram said the queue stores the message on disk because it is durable, and the table said `delivery_mode: 2` means "Message persisted to disk." RabbitMQ documentation distinguishes durable queues from persistent messages, and notes that persistent messages should be used with durable queues. Updated the wording to avoid implying that queue durability alone persists message bodies.

## Review Notes
- RabbitMQ's official tutorial notes that marking messages persistent does not fully guarantee message survival in every failure window; publisher confirms are needed for stronger publish-side guarantees. The post remains accurate for a beginner introduction, but a future production-focused article should cover publisher confirms.
- The queue FIFO explanation is acceptable for an introductory guide, but RabbitMQ ordering can be affected by multiple consumers, redeliveries, priorities, and other queue features.
