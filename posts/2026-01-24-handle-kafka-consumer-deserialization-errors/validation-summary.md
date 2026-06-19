# Validation Summary: How to Handle Kafka Consumer Deserialization Errors

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka consumers and producers
- Spring Kafka
- Spring Kafka `ErrorHandlingDeserializer`
- Spring Kafka `DefaultErrorHandler` and `DeadLetterPublishingRecoverer`
- Confluent Schema Registry compatibility configuration
- Avro schema evolution
- Java deserializers
- Prometheus alert rules

## Sources Consulted
- Apache Kafka consumer configuration reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Spring Kafka serialization/deserialization reference: https://docs.spring.io/spring-kafka/reference/kafka/serdes.html
- Spring Kafka exception handling reference: https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html
- Spring Kafka `DeserializationException` API docs: https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/DeserializationException.html
- Spring Kafka `DefaultErrorHandler` API docs: https://docs.spring.io/spring-kafka/api/org/springframework/kafka/listener/DefaultErrorHandler.html
- Confluent Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Registry schema evolution and compatibility docs: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html

## Issues Found
- The custom deserializer usage treated every `null` value as a deserialization failure. Kafka records can legitimately have `null` values, such as tombstones. Updated the comment and handler name to avoid that incorrect assumption.
- The manual DLQ producer claimed to preserve original bytes, but `ErrorHandlingDeserializer` returns `null` for failed deserialization. Updated the example to extract raw failed bytes from Spring Kafka's serialized `DeserializationException` header via `getData()`.
- The retry section implied deserialization failures are generally transient. Updated the text to clarify that retry with backoff is appropriate for transient processing errors after fetch, while malformed payloads usually fail deterministically and should go to a DLQ.
- The Spring Kafka section recommended `SeekToCurrentErrorHandler`, which is legacy and replaced by `DefaultErrorHandler` in current Spring Kafka. Updated the guidance to recommend `DefaultErrorHandler`.
- The Spring Kafka DLQ example used literal DLT header names. Updated the code to use `KafkaHeaders.DLT_ORIGINAL_TOPIC` and `KafkaHeaders.DLT_EXCEPTION_MESSAGE`, matching Spring Kafka's documented constants.
- The `DeadLetterPublishingRecoverer` example used a `KafkaTemplate<byte[], byte[]>`, which can fail for non-byte payloads handled by the same error handler. Updated the snippet to use `KafkaTemplate<Object, Object>`.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. The examples remain illustrative snippets rather than complete compilable classes; future improvement could add imports and serializer configuration for each Spring Kafka template used by the DLT publisher.
