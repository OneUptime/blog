# Validation Summary: How to Implement Event Sourcing with Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Producer and Consumer APIs
- Kafka transactions and idempotent producers
- Event sourcing
- CQRS and projections
- Java
- Jackson JSON serialization

## Sources Consulted
- Apache Kafka `KafkaProducer` Javadoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka consumer configuration reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka consumer API Javadoc: https://javadoc.io/doc/org.apache.kafka/kafka-clients/latest/org/apache/kafka/clients/consumer/Consumer.html
- Apache Kafka introduction and topic/log documentation: https://kafka.apache.org/documentation/
- Jackson `ObjectMapper` Javadoc: https://fasterxml.github.io/jackson-databind/javadoc/2.13/com/fasterxml/jackson/databind/ObjectMapper.html
- Jackson polymorphic deserialization documentation: https://github.com/FasterXML/jackson-docs/wiki/JacksonPolymorphicDeserialization
- Oracle Java pattern matching documentation: https://docs.oracle.com/en/java/javase/21/language/pattern-matching.html
- Microsoft Azure Architecture Center event sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- Martin Fowler, Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html

## Issues Found
- The Jackson serialization example used global default typing for the event hierarchy while the event classes had final fields and no no-argument constructors. This would not reliably deserialize the shown classes. I changed the event hierarchy to use explicit `@JsonTypeInfo` / `@JsonSubTypes`, added Jackson field visibility, and added no-argument constructors for deserialization.
- The Kafka producer used `beginTransaction()` without configuring `transactional.id` or calling `initTransactions()`. Kafka requires both before using transactional producer APIs. I added a transactional ID and initialized transactions.
- The single-event append path sent records outside a transaction even though the producer is transactional. Kafka requires sends from a transactional producer to be part of transactions. I changed `append()` to delegate to `appendAll()` and moved record sending into a private helper.
- The event replay loop treated an empty `poll()` as the end of the topic, which can stop before the consumer reaches the current end offsets. I changed it to read until the assigned partitions reach their captured end offsets.
- The replay consumer read with the default isolation level, which can expose aborted transactional records. I set `isolation.level` to `read_committed`.
- The optimistic locking check compared against the aggregate's post-change version, so it could miss concurrent writes. I changed it to compare against the version immediately before the first uncommitted event and labeled it as best-effort because Kafka alone does not provide an atomic per-aggregate compare-and-append operation.
- The projection handler accepted a `groupId` parameter but did not use it. I removed the unused parameter from the method signature.
- Snapshot writes were asynchronous and ignored send failures. I changed the example to wait for the send result and throw an exception on failure.

## Review Notes
The article is technically relevant and useful as a conceptual guide. The snippets remain illustrative and omit surrounding types such as `OrderItem`, `Snapshot`, repositories, constructors, and imports, so they are not a complete drop-in application. The Java switch pattern syntax is valid for modern Java releases such as Java 21.
