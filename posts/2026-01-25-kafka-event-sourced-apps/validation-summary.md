# Validation Summary: How to Build Event-Sourced Apps with Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Event sourcing
- Spring for Apache Kafka
- Java records and sealed interfaces
- Elasticsearch Java API Client
- Apache Avro
- Schema Registry concepts
- Kafka topic configuration

## Sources Consulted
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Apache Kafka topic configuration reference: https://kafka.apache.org/30/generated/topic_config.html
- Spring for Apache Kafka, Sending Messages: https://docs.spring.io/spring-kafka/reference/kafka/sending-messages.html
- Apache Avro 1.11.1 Specification: https://avro.apache.org/docs/1.11.1/specification/
- Elasticsearch Java API Client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/java
- Elasticsearch Update API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-update

## Issues Found
- The Kafka producer snippet called `event.createdAt()` on the `OrderEvent` interface, but only `OrderCreated` defines `createdAt`; `OrderShipped` and `OrderCancelled` use different timestamp accessors. Changed the code to derive `eventTime` with an exhaustive switch over the sealed event types.
- The snapshot service called `order.apply(event)` even though `apply` was private in the aggregate snippet. Made `apply` public and added the `getOrderId()` and `copy()` methods already used by the snapshot example.
- The snapshot service reused the stored snapshot object and then applied later events to it, mutating the cached snapshot. Changed it to apply subsequent events to a copy of the snapshot state.
- The Kafka repository replay loop stopped on the first empty poll, which can happen before the consumer has reached the end of the assigned partition. Changed it to read until the consumer position reaches the partition end offset.
- The Elasticsearch listener used client methods that throw `IOException` without declaring or handling it. Added `throws IOException`.
- The Elasticsearch update calls omitted the response document class parameter needed by the Java API Client overload when using builder lambdas with `Map` partial documents. Added `Map.class`.
- The Avro schema used `double` for `totalAmount`, which did not match the Java `BigDecimal` example and is not appropriate for fixed-point money values. Changed it to Avro `bytes` with the `decimal` logical type, precision, and scale.
- The Avro `timestamp-millis` logical type was placed as a field attribute instead of on the Avro type object. Changed `createdAt` to use a nested type object with `logicalType`.
- The `min.insync.replicas=2` explanation described it as a standalone durability guarantee. Kafka applies this requirement when producers use `acks=all`, so the wording was corrected.

## Review Notes
The examples remain simplified for a blog post. A production Kafka event store should also define producer settings such as `acks=all`, idempotence, serialization classes, schema registry configuration, and a robust partition lookup strategy for replaying one aggregate's key.
