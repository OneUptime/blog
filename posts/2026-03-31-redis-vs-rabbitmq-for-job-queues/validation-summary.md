# Validation Summary: Redis vs RabbitMQ for Job Queues

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- Redis
- RabbitMQ
- BullMQ (Node.js job queue library)
- ioredis (Node.js Redis client)
- pika (Python RabbitMQ/AMQP client)
- AMQP 0-9-1 / AMQP 1.0
- Celery (mentioned)
- Sidekiq (mentioned)

## Sources Consulted
- BullMQ official documentation (https://docs.bullmq.io/)
- pika official documentation (https://pika.readthedocs.io/)
- RabbitMQ official documentation (https://www.rabbitmq.com/docs)
- RabbitMQ Dead Letter Exchanges documentation (https://www.rabbitmq.com/docs/dlx)
- RabbitMQ Delayed Message Exchange plugin documentation
- Redis Streams documentation (https://redis.io/docs/latest/develop/data-types/streams/)

## Issues Found
No technical issues found.

## Review Notes
- The comparison table entry for RabbitMQ delayed jobs says "Via plugins," which refers to the `rabbitmq_delayed_message_exchange` plugin. Delays can also be simulated via TTL + DLX without a plugin, but the table characterization is a fair simplification for a comparison.
- RabbitMQ 4.0+ supports AMQP 1.0 natively (no longer requires a plugin). The table correctly lists both "AMQP 0-9-1 / AMQP 1.0" without specifying plugin dependency, which is accurate for current versions.
- The Redis protocol is labeled "Proprietary" in the table. While Redis uses the documented RESP protocol, calling it "Proprietary" in contrast to AMQP (an industry standard) is a reasonable characterization in this context.
- All code examples are syntactically correct and use current, non-deprecated APIs for BullMQ and pika.
