# Validation Summary: RabbitMQ Acknowledgements and Redelivery: When Can the Same Work Run Twice?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- RabbitMQ 4.3
- AMQP 0-9-1
- RabbitMQ Java Client 5.28
- Java
- PostgreSQL 18
- SQL transactions and idempotent consumer patterns

## Sources Consulted

- [RabbitMQ consumer acknowledgements and publisher confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ consumers guide](https://www.rabbitmq.com/docs/consumers)
- [RabbitMQ consumer prefetch](https://www.rabbitmq.com/docs/consumer-prefetch)
- [RabbitMQ negative acknowledgements](https://www.rabbitmq.com/docs/nack)
- [RabbitMQ queues and message ordering](https://www.rabbitmq.com/docs/queues#message-ordering)
- [RabbitMQ quorum queues and poison-message handling](https://www.rabbitmq.com/docs/quorum-queues#poison-message-handling)
- [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)
- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ AMQP 0-9-1 compatibility and conformance](https://www.rabbitmq.com/docs/specification)
- [AMQP 0-9-1 specification](https://www.rabbitmq.com/resources/specs/amqp-xml-doc0-9-1.pdf)
- [RabbitMQ Java Client API guide](https://www.rabbitmq.com/client-libraries/java-api-guide)
- [RabbitMQ Java Client 5.28 `Channel` API](https://rabbitmq.github.io/rabbitmq-java-client/api/current/com/rabbitmq/client/Channel.html)
- [PostgreSQL 18 `INSERT` documentation](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL 18 data-modifying statements in `WITH`](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING)

## Issues Found

- The prefetch discussion implied that `basicQos(50)` imposed one channel-wide replay bound. RabbitMQ applies that overload separately to each new consumer by default, so the text now explains that the channel's replay exposure also depends on how many consumers share it.
- The quorum-queue discussion did not state the current RabbitMQ 4.3 counter semantics. It now distinguishes `x-delivery-count` from `x-acquired-count`, identifies the default delivery limit introduced in RabbitMQ 4.0, and documents which failure paths increment `delivery-count` in RabbitMQ 4.3.
- The PostgreSQL example placed an unconditional shipment `INSERT` after `INSERT ... ON CONFLICT DO NOTHING RETURNING`, so the shipment would still be inserted when the inbox row conflicted. The two inserts are now connected through a data-modifying CTE, causing the business effect to run only when the inbox insert returns a new row.
- The final test referred to losing an acknowledgement response, but AMQP 0-9-1 `basic.ack` is asynchronous and has no broker response. It now tests connection loss while the acknowledgement frame is in flight.
- The delivery-limit test did not name a return operation that increments the current quorum-queue `delivery-count`. It now specifies `basic.reject(..., true)` for RabbitMQ 4.3 or later; `basic.nack` does not increment that counter in RabbitMQ 4.3.

## Review Notes

- The acknowledgement-timeout behavior is version-specific: starting with RabbitMQ 4.3, delivery acknowledgement timeouts are supported only by quorum queues. The post's wording limits the claim to supported queues.
- RabbitMQ's quorum-queue counter and retry behavior changed in RabbitMQ 4.3, so operators on earlier releases should consult the documentation for their exact release.
- The Java snippet uses current, non-deprecated RabbitMQ Java Client callback and acknowledgement APIs. It intentionally remains a sketch and omits connection recovery and the retry topology, as the post states.
