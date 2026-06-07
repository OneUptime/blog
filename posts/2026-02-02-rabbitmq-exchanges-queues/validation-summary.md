# Validation Summary: How to Create Exchanges and Queues in RabbitMQ

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (3.x, management plugin)
- AMQP 0-9-1 protocol
- Node.js with `amqplib` library
- Exchange types: direct, fanout, topic, headers
- Queue features: TTL, max length, max bytes, lazy mode, priorities, exclusivity, dead-letter exchanges
- Bindings (queue-to-exchange and exchange-to-exchange)
- Publisher confirms, alternate exchanges, mandatory publishing
- `rabbitmqctl` and `rabbitmqadmin` CLI tools
- Docker (for running RabbitMQ locally)

## Sources Consulted
- RabbitMQ AMQP 0-9-1 model and concepts: https://www.rabbitmq.com/tutorials/amqp-concepts
- RabbitMQ exchanges, queues, and bindings reference: https://www.rabbitmq.com/docs/queues, https://www.rabbitmq.com/docs/publishers
- amqplib (node-amqp) API reference: https://amqp-node.github.io/amqplib/channel_api.html
- RabbitMQ topic exchange routing rules: https://www.rabbitmq.com/tutorials/tutorial-five-javascript
- RabbitMQ headers exchange / x-match semantics: https://www.rabbitmq.com/docs/exchanges#exchange-types
- RabbitMQ TTL, max-length, overflow policies: https://www.rabbitmq.com/docs/ttl, https://www.rabbitmq.com/docs/maxlength
- RabbitMQ dead letter exchanges: https://www.rabbitmq.com/docs/dlx
- RabbitMQ alternate exchanges: https://www.rabbitmq.com/docs/ae
- RabbitMQ priority queues: https://www.rabbitmq.com/docs/priority
- RabbitMQ publisher confirms: https://www.rabbitmq.com/docs/confirms
- `rabbitmqadmin` reference: https://www.rabbitmq.com/docs/management-cli
- Docker Hub `rabbitmq` image: https://hub.docker.com/_/rabbitmq

## Issues Found
1. **Duplicate object keys in headers exchange binding** (Creating a Headers Exchange section). The image-processing queue binding used a JavaScript object literal with two `'format'` keys (`'jpeg'` and `'png'`). In JavaScript, duplicate keys silently overwrite, so the binding would only have `format=png` — contradicting the surrounding comment which described matching jpeg or png. Fixed by splitting into two separate bindings (one per format value), which is the standard RabbitMQ pattern for matching multiple values of the same header, and added a note explaining the limitation.

## Review Notes
- The post uses `rabbitmq:3-management` Docker tag, which still works but is not the latest major (RabbitMQ 4.x is current). The example code is compatible with both 3.x and 4.x.
- `x-queue-mode: 'lazy'` is honored by RabbitMQ 3.x but has been deprecated for classic queues with the introduction of classic queue v2 (CQv2) as the default in 3.12+, and is effectively ignored in 4.x. The post's use is still valid, but readers running 4.x should be aware that the setting no longer has its original effect. Not strictly an error — left as-is.
- `rabbitmqadmin get queue=my.queue count=10` in current RabbitMQ versions emits a warning when `ackmode` is omitted (default behavior `ack_requeue_true` is used). The command still works, so left as-is.
- The duplicate `'format'` headers issue is the kind of subtle bug that would only surface when actually running the example; otherwise the post is well-structured and the rest of the code, CLI invocations, mermaid diagrams, and conceptual explanations check out against official RabbitMQ documentation.
