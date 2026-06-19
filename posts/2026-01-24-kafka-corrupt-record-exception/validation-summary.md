# Validation Summary: How to Fix 'CorruptRecordException' in Kafka

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java clients
- Kafka CLI tools
- Confluent Schema Registry
- Avro
- Java serialization/deserialization
- Dead letter queues

## Sources Consulted
- Apache Kafka `CorruptRecordException` Javadoc: https://kafka.apache.org/0100/javadoc/index.html?org%2Fapache%2Fkafka%2Fcommon%2Ferrors%2FCorruptRecordException.html=
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Apache Kafka system tools documentation for `DumpLogSegments`: https://cwiki.apache.org/confluence/display/KAFKA/System%2BTools
- Apache Kafka KIP-460 leader election RPC: https://cwiki.apache.org/confluence/display/KAFKA/KIP-460%3A%2BAdmin%2BLeader%2BElection%2BRPC
- Confluent Avro serializer/deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html
- Apache Avro `SchemaValidatorBuilder` Javadoc: https://avro.apache.org/docs/1.8.0/api/java/org/apache/avro/SchemaValidatorBuilder.html
- Kafka `ProducerRecord` Javadoc: https://kafka.apache.org/0110/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html

## Issues Found
- The post incorrectly described serialization mismatches and schema evolution as direct causes of `CorruptRecordException`. Kafka documents `CorruptRecordException` as an internal record CRC/integrity failure generally caused by network or disk corruption, so the wording was changed to distinguish true Kafka record corruption from deserialization/schema failures that can look similar to consumers.
- The initial "wrong" deserializer example claimed Avro data with `StringDeserializer` would fail. `StringDeserializer` can decode arbitrary bytes as text and may produce unreadable output rather than reliably failing, so the example was changed to using `KafkaAvroDeserializer` on non-Avro data.
- The error-tolerant deserializer and DLQ sections implied they could handle broker-level corrupt records. They were corrected to state that these patterns handle malformed payloads after Kafka successfully fetches the record, not record batches that fail Kafka's internal CRC checks before delivery.
- The DLQ producer used asynchronous `send()` and then allowed offsets to be committed before DLQ delivery was confirmed. The example now waits for `send(...).get()` before continuing, so records are not committed before the DLQ write succeeds.
- The DLQ header code used platform-default charsets and could fail on a null exception message. It now uses `StandardCharsets.UTF_8` and `String.valueOf(error.getMessage())`.
- The `kafka-dump-log.sh --verify-index-only` example targeted a `.log` file even though the option verifies index logs. It now targets the `.index` file.
- The index inspection command combined an index file with `--print-data-log`, which is intended for data logs. The flag was removed for index inspection.
- The manual Schema Registry wire-format parser threw `CorruptRecordException` for an unknown magic byte. That is a deserialization/wire-format error, so it now throws `SerializationException`.
- The producer checksum example hashed `value.toString()` with MD5, while the consumer verified the raw value bytes. This could produce mismatched checksums and used an outdated digest. The example now accepts a `Function<V, byte[]>` encoder and uses SHA-256 over the same serialized bytes the consumer should verify.
- The recovery and summary text overstated "reassign partition" as the generic fix for log corruption. It now says to recover from a healthy replica or backup, and to move leadership or replace the replica when a healthy replica exists.

## Review Notes
The Java snippets remain illustrative and omit imports and dependency declarations, which is acceptable for this post style. In a future revision, the article could call out specific tested library versions for Spring Kafka JSON deserialization and Confluent serializers.
