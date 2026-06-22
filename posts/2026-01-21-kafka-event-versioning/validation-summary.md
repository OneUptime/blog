# Validation Summary: How to Implement Event Versioning in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer and consumer APIs
- Confluent Kafka Python client
- Jackson JSON processing
- Java
- Python
- Schema evolution and Schema Registry concepts

## Sources Consulted
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Apache Kafka KafkaConsumer Javadocs: https://kafka.apache.org/31/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka Producer API Javadocs: https://archive.apache.org/dist/kafka/4.0.0/javadoc/org/apache/kafka/clients/producer/Producer.html
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Schema Registry schema evolution documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Jackson ObjectMapper Javadocs: https://fasterxml.github.io/jackson-databind/javadoc/2.8/com/fasterxml/jackson/databind/ObjectMapper.html
- Jackson ObjectNode Javadocs: https://fasterxml.github.io/jackson-databind/javadoc/2.9/com/fasterxml/jackson/databind/node/ObjectNode.html
- Java BigDecimal Javadocs: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Java version router snippet imported unused Kafka packages but omitted required `Map` and `HashMap` imports. Updated imports to match the code.
- The event type version extraction returned `2` for an event type like `OrderCreated.v2`, while the rest of the article used semantic versions like `2.0`. Normalized integer suffixes to `2.0` in both Java and Python router examples.
- The Java event class snippet referenced `EventMetadata` and `BigDecimal` without defining/importing them. Added a minimal `EventMetadata` model, a copy method, and the required `BigDecimal` import.
- The Java event class snippet had multiple `public` top-level model classes in one code block, which would not compile as one source file. Changed supporting model classes to package-private.
- The Java upcaster mutated the original V1 metadata object when changing the version. Updated it to copy metadata before setting the V2 version.
- The Java JSON upcaster used direct `get()` calls that could throw null-pointer errors for missing metadata or data fields. Updated the example to use Jackson `path()` defaults where appropriate.
- The Java JSON upcaster converted monetary amounts with `asDouble()`, losing decimal precision. Updated it to preserve numeric values as `BigDecimal`.
- The Java upcaster snippet used `ObjectNode` without importing it. Added the required Jackson imports.
- The Java multi-version consumer declared an unused `version` variable and used `JsonNode` only for that unused code. Removed the dead code and import.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python documentation. Replaced it with `datetime.now(UTC)` and preserved the trailing `Z` timestamp format.
- The Python example imported unused `Any` and `Optional` types. Removed those imports.
- The Java dual-write producer had a `final` producer field with no constructor initialization. Added a constructor.
- The Java dual-write producer and migration examples sent records asynchronously without checking for send failures. Updated the examples to wait on `send(...).get()` where the surrounding logic assumes the write succeeded.
- The Java migration consumer referenced undefined fields and helper methods. Added the missing producer, consumer properties, upcaster field, constructor, `createConsumer`, and `processLatestVersion` stub.
- The Java migration example committed source offsets immediately after asynchronous target writes. Updated it to wait for the target write before committing.

## Review Notes
The article is technically relevant and the corrected examples align with current Kafka, Jackson, Confluent Kafka Python, Java, and Python datetime APIs. Future improvements could discuss Schema Registry compatibility modes in more detail and use Python `Decimal` for monetary values, but the current Python float example is syntactically valid and not a Kafka API correctness issue.
