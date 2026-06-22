# Validation Summary: How to Handle Event-Driven Communication

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Event-driven architecture
- Apache Kafka
- RabbitMQ / AMQP
- Java
- Python / Pika
- JavaScript / amqplib
- Apache Avro and Schema Registry
- Prometheus alerting rules
- OpenTelemetry JavaScript API

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- RabbitMQ Consumer Acknowledgements and Publisher Confirms: https://www.rabbitmq.com/docs/confirms
- RabbitMQ Dead Letter Exchanges: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Time-To-Live and Expiration: https://www.rabbitmq.com/docs/ttl
- Pika BlockingConnection Delivery Confirmations: https://pika.readthedocs.io/en/stable/examples/blocking_delivery_confirmations.html
- Apache Avro Specification: https://avro.apache.org/docs/1.11.1/specification/
- Prometheus Alerting Rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- OpenTelemetry JavaScript Instrumentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The RabbitMQ Python consumer configured queues with `x-dead-letter-exchange: events.dlx` but did not declare or bind the dead letter exchange and queue. Added `events.dlx`, `events.dlq`, and a `dead.letter` binding so rejected messages have a valid DLQ route.
- The RabbitMQ retry JavaScript example assumed `msg.properties.headers` always exists. Updated `getRetryCount` and retry header copying to handle messages without headers safely.
- The Avro schema example referenced an undefined `OrderItem` type and used a decimal logical type without the required `precision`. Inlined the `OrderItem` record and added `precision` and `scale` to decimal fields.
- The OpenTelemetry JavaScript example used `SpanKind` and `SpanStatusCode` without importing them. Added both symbols to the `@opentelemetry/api` import.
- The Python publisher used `datetime.utcnow()`, which is deprecated as of Python 3.12 and returns a naive datetime. Replaced it with `datetime.now(timezone.utc)` and updated the import.
- The RabbitMQ Python consumer read `properties.headers.get(...)` directly. Updated it to tolerate messages with no headers.

## Review Notes
The remaining Java examples are illustrative and omit ordinary surrounding application boilerplate such as logger declarations, dependency injection constructors, model getters/setters, and persistence implementations for idempotency. Those omissions are acceptable for a blog-level guide, but production code should include durable idempotency storage, explicit DLQ publication behavior for Kafka failures, and full tracing context propagation via broker headers where possible.
