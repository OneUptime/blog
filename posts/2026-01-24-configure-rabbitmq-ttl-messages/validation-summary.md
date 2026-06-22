# Validation Summary: How to Configure RabbitMQ TTL for Messages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ
- AMQP 0-9-1
- Pika Python client
- RabbitMQ policies
- RabbitMQ Management HTTP API
- RabbitMQ Prometheus exporter
- Dead letter exchanges

## Sources Consulted
- RabbitMQ Time-to-Live and Expiration documentation: https://www.rabbitmq.com/docs/ttl
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Prometheus metrics reference: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- RabbitMQ Monitoring documentation: https://www.rabbitmq.com/docs/monitoring
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- Pika channel documentation: https://pika.readthedocs.io/en/stable/modules/channel.html
- Pika BasicProperties documentation: https://pika.readthedocs.io/en/stable/modules/spec.html

## Issues Found
- Queue expiration comments described `x-expires` as depending only on no consumers. Updated the comments to include RabbitMQ's full unused-queue semantics: no consumers, no recent redeclare, and no `basic.get` activity.
- The session queue example implied the queue expires exactly when the session ends. Updated the wording to clarify that messages expire after the timeout and the queue is deleted after being unused for the timeout.
- The session queue helper leaked its Pika connection. Added `connection.close()` before returning the queue name.
- The retry helper referenced `method.body`, but Pika passes the message body separately from the delivery method frame. Updated the function signature to accept `body`, use a configurable `base_queue`, and route to the matching retry exchange.
- The retry setup configured the main queue dead letter exchange without a routing key that matched any retry queue binding. Added `x-dead-letter-routing-key: '0'` so broker-side rejections can enter the first retry queue.
- The Prometheus query used `rabbitmq_queue_messages_dead_lettered_expired_total`, which is not the current official RabbitMQ exporter metric. Replaced it with `rabbitmq_global_messages_dead_lettered_expired_total`.
- The queue-head TTL pitfall was stated too broadly. Scoped it to per-message TTL cleanup and changed the wording from "won't expire" to "may not be removed" to match RabbitMQ's documented behavior.
- The TTL precision snippet used `time.time()` without importing `time`. Added the missing import.
- The best-practice note said per-message TTL can cause out-of-order expiration. Updated it to the more accurate caveat that per-message TTL can delay cleanup behind non-expired messages.

## Review Notes
- RabbitMQ's official documentation recommends policies over hardcoded queue `x-arguments` when settings need to be changed without deleting and redeclaring queues. The post already includes policy examples, but future revisions could emphasize that operational preference more strongly.
- Per-queue Prometheus metrics require per-object or detailed metric exposure in many RabbitMQ configurations; the post now notes that caveat in the query comments.
