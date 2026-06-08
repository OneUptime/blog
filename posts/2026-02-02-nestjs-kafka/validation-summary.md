# Validation Summary: NestJS Kafka

## Status
validated

## Post Type
Conceptual overview / Guide (high-level descriptive prose, no code samples)

## Technologies Covered
- NestJS (`@nestjs/microservices`)
- Apache Kafka
- ClientKafka / `Transport.KAFKA`
- `@MessagePattern()` and `@EventPattern()` decorators
- KafkaContext (partition, offset, headers access)
- Kafka transactions
- Schema Registry (e.g., Confluent Schema Registry)
- TypeScript

## Sources Consulted
- NestJS Microservices Kafka documentation: https://docs.nestjs.com/microservices/kafka
- kafkajs (the underlying client library used by NestJS): https://kafka.js.org/
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Kafka transactions overview: https://kafka.apache.org/documentation/#semantics
- Confluent Schema Registry: https://docs.confluent.io/platform/current/schema-registry/index.html

## Issues Found
- The original text referenced "configuring the KafkaClient in your microservices module." The actual NestJS class is `ClientKafka`, and the transport identifier is `Transport.KAFKA`. Updated the sentence to use the correct terminology: "configuring the Kafka transport (`Transport.KAFKA`) in your microservices module, with the `ClientKafka` class used on the producer side." Also clarified "client and group IDs" to "client and consumer group IDs" for precision.

## Review Notes
- The post is purely descriptive — there are no code blocks, commands, or configuration snippets to verify. All claims about NestJS Kafka behavior (decorator semantics, KafkaContext, ClientKafka producer, transactions, DLQ patterns, Schema Registry) are accurate.
- Kafka does not have a native dead letter queue concept; DLQs are an application-level pattern typically implemented as a separate topic. The post's wording ("Dead letter queues handle poison messages") is acceptable as a generic statement but readers should understand DLQs must be implemented manually in Kafka.
- The post does not specify NestJS or kafkajs versions; the claims are accurate against current NestJS v10/v11 and kafkajs ≥ 2.x.
