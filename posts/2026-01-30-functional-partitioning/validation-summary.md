# Validation Summary: How to Build Functional Partitioning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Functional partitioning
- Microservices architecture
- Database-per-service data ownership
- Event-driven communication
- Transactional outbox pattern
- Saga pattern and eventual consistency
- Node.js, Express, and http-proxy-middleware
- Change Data Capture with Debezium
- OpenTelemetry distributed tracing
- Protobuf and JSON Schema

## Sources Consulted
- Express middleware guide: https://expressjs.com/en/guide/using-middleware/
- http-proxy-middleware documentation: https://github.com/chimurai/http-proxy-middleware
- Microsoft Learn, data sovereignty per microservice: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/data-sovereignty-per-microservice
- Microsoft Learn, Saga pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/saga
- Microservices.io, Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- AWS Prescriptive Guidance, Transactional Outbox pattern: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- Debezium documentation/homepage for Change Data Capture: https://debezium.io/
- OpenTelemetry context propagation documentation: https://opentelemetry.io/docs/concepts/context-propagation/
- Protocol Buffers documentation: https://protobuf.dev/
- JSON Schema documentation: https://json-schema.org/

## Issues Found
- The cross-database join example used `JOIN orders.items ON inventory.products`, which is not a realistic SQL join expression. Changed it to describe a query joining `orders`, `order_items`, and `products` instead.
- The migration section said dual writes keep both databases in sync. Plain dual writes can leave partial failures, so the text now says to use idempotent retries and reconciliation.
- The order event example wrote the order and then published directly to the message queue. That can lose the event if the process crashes after the database write, and the snippet also omitted the `OrderDB` import. Changed the example to write an outbox event in the same local database transaction as the order and clarified that a relay publishes the queued event.

## Review Notes
The remaining examples are illustrative pseudocode around local `OrderDB`, `InventoryDB`, `MessageQueue`, and `httpClient` abstractions, not complete runnable services. The Express and http-proxy-middleware routing example uses current documented APIs. The architecture guidance aligns with database-per-service ownership, eventual consistency, saga compensation, CDC, and distributed tracing guidance from the consulted sources.
