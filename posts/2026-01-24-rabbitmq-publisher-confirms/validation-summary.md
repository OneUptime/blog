# Validation Summary: How to Handle RabbitMQ Publisher Confirms

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- RabbitMQ publisher confirms
- AMQP 0-9-1 acknowledgements and confirms
- Node.js with amqplib
- Python with pika
- Java with RabbitMQ Java Client
- Durable exchanges, persistent messages, durable queues, quorum queues

## Sources Consulted
- RabbitMQ Consumer Acknowledgements and Publisher Confirms: https://www.rabbitmq.com/docs/confirms
- RabbitMQ Reliable Publishing with Publisher Confirms tutorial for Java: https://www.rabbitmq.com/tutorials/tutorial-seven-java
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- Pika delivery confirmation example for BlockingConnection: https://pika.readthedocs.io/en/stable/examples/blocking_delivery_confirmations.html
- Pika BlockingConnection / BlockingChannel API documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Pika exceptions documentation: https://pika.readthedocs.io/en/stable/modules/exceptions.html

## Issues Found
- The introduction described publisher confirms as always ensuring messages are safely persisted. RabbitMQ confirms mean the broker has handled the publish; persistence applies specifically to persistent messages routed to durable queues. Updated the wording to make this distinction.
- The description and diagram used broad "guaranteed delivery" language. Publisher confirms verify broker-side handling, not consumer delivery or end-to-end processing. Narrowed the wording to broker acceptance.
- The confirm flow claimed messages are confirmed after being routed to at least one queue and replicated to mirrors. RabbitMQ confirms unroutable messages too, after the exchange determines they cannot route, and modern RabbitMQ documentation emphasizes quorum queue replication rather than classic mirrored queues. Updated the list and added the `mandatory` / `basic.return` caveat.
- The first amqplib example said `channel.publish` returns a promise that resolves on ACK and used `await channel.publish(...)`. amqplib's `ConfirmChannel#publish` does not return a promise; confirms are handled by a callback or by `waitForConfirms()`. Removed the misleading await/comment and retained `waitForConfirms()`.
- The batch amqplib publisher opened a connection as a local variable and never closed it. Added `this.connection` and closed it in `close()`.
- The async amqplib example used `ack` / `nack` channel events and manual sequence numbers. amqplib's documented confirm interface is per-publish callbacks plus `waitForConfirms()`, not public sequence-number callbacks. Reworked the example to resolve or reject each publish promise from the confirm callback.

## Review Notes
The Python pika examples match the documented BlockingConnection confirm behavior, where `confirm_delivery()` enables publisher acknowledgements and `basic_publish()` can raise `UnroutableError` or `NackError`. The Java example follows the RabbitMQ Java tutorial pattern for `confirmSelect()`, `getNextPublishSeqNo()`, `addConfirmListener()`, and `ConcurrentNavigableMap` tracking. The post still uses compact tutorial examples and does not cover every production concern, such as publisher-side idempotency, connection recovery edge cases, or backpressure handling in amqplib.
