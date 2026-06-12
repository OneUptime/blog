# Validation Summary: How to Implement the Choreography Pattern in Microservices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microservices choreography pattern
- Saga compensation pattern
- Event-driven architecture
- Apache Kafka and KafkaJS
- RabbitMQ
- AWS SNS/SQS
- Redis Streams
- TypeScript
- OpenTelemetry JavaScript API
- SQL event-store querying

## Sources Consulted
- KafkaJS consuming messages documentation: https://kafka.js.org/docs/consuming
- KafkaJS client configuration and retry documentation: https://kafka.js.org/docs/configuration
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Microservices.io Saga pattern reference: https://microservices.io/patterns/data/saga.html
- Microsoft Azure Architecture Center Saga pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/saga
- Microsoft Azure Architecture Center Choreography pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/choreography

## Issues Found
- The event delivery guarantees section described exactly-once delivery as only a theoretical ideal achieved through at-least-once delivery plus idempotency. This was too broad because brokers such as Kafka support exactly-once semantics for specific workflows via transactions and idempotent producers, while application-level side effects still require idempotency. Updated the wording to make that distinction.
- The `InventoryService` published `InventoryReserved` without `totalAmount`, but the later `PaymentService` example expected `totalAmount` from that event. Updated `InventoryService` to read `totalAmount` from `OrderCreated` and include it in the `InventoryReserved` payload.
- The compensation registry snippet called `inventoryRepository.release(orderId)`, but the later repository API requires both `orderId` and `eventId` for idempotency. Updated the calls to pass `event.eventId`.
- The KafkaJS dead-letter example used a non-documented retry option, `maxRetries`, and implied KafkaJS retry configuration was a dead-letter queue configuration. Updated the snippet to use the documented `retry.initialRetryTime` and `retry.retries` options and clarified that dead-letter publishing is handled explicitly by the wrapper function.

## Review Notes
The examples remain illustrative and omit surrounding infrastructure such as durable repositories, schema registry integration, transactional outbox publishing, and full OpenTelemetry SDK setup. Those omissions are acceptable for this guide, but production implementations should add them.
