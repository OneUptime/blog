# Validation Summary: How to Configure RabbitMQ Lazy Queues

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- RabbitMQ classic queues
- RabbitMQ lazy queues
- RabbitMQ quorum queues
- RabbitMQ policies and HTTP API
- RabbitMQ Shovel plugin
- RabbitMQ management API and Prometheus monitoring
- Python with Pika

## Sources Consulted
- RabbitMQ Lazy Queues documentation: https://www.rabbitmq.com/docs/lazy-queues
- RabbitMQ Classic Queues documentation: https://www.rabbitmq.com/docs/classic-queues
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Queue Length Limit documentation: https://www.rabbitmq.com/docs/maxlength
- RabbitMQ Policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/next/http-api-reference
- RabbitMQ Dynamic Shovels documentation: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ rabbitmqctl manual page: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ 3.12 performance improvements blog: https://www.rabbitmq.com/blog/2023/05/17/rabbitmq-3.12-performance-improvements

## Issues Found
- The post recommended `queue.default_queue_mode = lazy` in `rabbitmq.conf`, but RabbitMQ does not document this as a supported configuration key. Replaced it with a broad `rabbitmqctl set_policy` example, which is the documented way to apply lazy mode to matching queues.
- The HTTP API policy example omitted `priority`. RabbitMQ's HTTP API reference documents `pattern`, `definition`, `priority`, and `apply-to` as mandatory keys for policy updates, so the example now includes `"priority":1`.
- The RabbitMQ 3.12+ quorum queue guidance recommended `x-max-in-memory-length: 0` and `x-max-in-memory-bytes: 0` for lazy-like behavior. Current quorum queue documentation describes quorum queues as not keeping message bodies in memory and focuses on metadata/WAL memory use, so the example now declares a quorum queue with `x-queue-type: quorum` only.
- The post said classic queue modes are deprecated in RabbitMQ 3.12+. Clarified that lazy mode is no longer supported/has no effect, while classic queues themselves remain supported.
- The migration section said existing queue mode cannot be changed. That is too broad because policies can apply lazy mode to existing matching queues in RabbitMQ 3.11 and earlier. The text now clarifies that hardcoded `x-arguments` cannot be changed by redeclaring an existing queue.
- The Shovel example used `"delete-after": "queue-length"`, but RabbitMQ dynamic shovel documentation uses `src-delete-after`. Updated the JSON key to `"src-delete-after": "queue-length"`.

## Review Notes
The lazy queue examples are only meaningful for RabbitMQ 3.11 and earlier because RabbitMQ 3.12+ ignores `x-queue-mode=lazy`. Future revisions could split the article into a legacy RabbitMQ 3.11 section and a modern RabbitMQ 3.12+/4.x section to reduce reader confusion.
