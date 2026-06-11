# Validation Summary: How to Implement Kafka Custom Serializers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka Java client serializers and deserializers
- Java
- Jackson JSON serialization
- JSON Schema validation
- Apache Avro
- Confluent Schema Registry
- Protocol Buffers

## Sources Consulted
- Apache Kafka `Serializer<T>` Javadoc: https://javadoc.io/static/org.apache.kafka/kafka-clients/3.9.0/org/apache/kafka/common/serialization/Serializer.html
- Apache Kafka `Deserializer<T>` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/common/serialization/Deserializer.html
- Apache Kafka `ProducerRecord` Javadoc: https://kafka.apache.org/23/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- Confluent Schema Registry SerDes documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html
- Confluent Avro serializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html
- Confluent Schema Registry `SchemaRegistryClient` source/Javadoc reference: https://github.com/confluentinc/schema-registry/blob/master/client/src/main/java/io/confluent/kafka/schemaregistry/client/SchemaRegistryClient.java
- Protocol Buffers Java tutorial: https://protobuf.dev/getting-started/javatutorial/
- Protocol Buffers Java `Parser` source reference: https://chromium.googlesource.com/external/github.com/google/protobuf/+/HEAD/java/core/src/main/java/com/google/protobuf/Parser.java
- Confluent Kafka log compaction documentation: https://docs.confluent.io/kafka/design/log_compaction.html

## Issues Found
- The JSON schema serializer did not handle `null` input. Added a `null` check that returns `null`, matching Kafka serializer/deserializer expectations for null payloads.
- The Avro serializer did not handle `null` input. Added a `null` check to avoid converting tombstones into serialization failures.
- The Avro serializer used the deprecated `SchemaRegistryClient.register(String, org.apache.avro.Schema)` overload. Updated it to register `new AvroSchema(schema)`, which matches the current Confluent API direction.
- The Protocol Buffers deserializer did not handle `null` input. Added a `null` check before calling `parser.parseFrom(data)`.
- The schema-version deserializer accessed `data[0]` without checking for `null` or empty payloads. Added a guard to avoid `NullPointerException` or `ArrayIndexOutOfBoundsException`.
- The error-handling example said returning `null` would skip a message. In Kafka, a null serialized value is still sent as a null payload and may act as a tombstone on compacted topics. Updated the comment to describe this accurately.

## Review Notes
The examples are illustrative snippets and omit imports plus helper methods such as `loadSchema`, `getParser`, `deserializeV1`, and `deserializeV2`. Those omissions are acceptable for the post's tutorial style, but a future revision could mention required imports for `AvroSchema` and the chosen JSON Schema validation library.
