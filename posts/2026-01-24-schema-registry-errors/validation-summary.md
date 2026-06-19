# Validation Summary: How to Fix 'Schema Registry' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Confluent Schema Registry
- Apache Kafka
- Avro schema evolution
- confluent-kafka Python client
- Schema Registry REST API
- Prometheus Python client
- curl and jq

## Sources Consulted
- Confluent Schema Registry API Reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Evolution and Compatibility: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Schema Registry SerDes, subject naming strategies, and wire format: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html
- confluent-kafka Python API Reference: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- confluent-kafka Python subject naming strategy source: https://github.com/confluentinc/confluent-kafka-python/blob/master/src/confluent_kafka/schema_registry/__init__.py

## Issues Found
- The first Python schema compatibility example used `Schema(...)` without importing `Schema`. Added `Schema` to the `confluent_kafka.schema_registry` import.
- The schema restoration example used `SchemaRegistryClient`, `Schema`, and `json` without importing them in that snippet. Added the required imports.
- The message schema debugging example used `SchemaRegistryClient` without importing it. Added the required import.
- The compatibility analysis comments incorrectly stated that removed fields break backward compatibility and added required fields break forward compatibility. Updated the comments and guidance to match Confluent's Avro compatibility rules: adding required fields breaks backward compatibility, while removing fields can break forward compatibility when old readers cannot supply defaults.
- The deserialization error handler caught `SerializationException`, which is not the current confluent-kafka Python error class. Updated it to catch `ValueDeserializationError` and use the attached `kafka_message` for topic, partition, offset, and DLQ handling.
- The subject naming strategy example used custom lambdas with the wrong callable signature for current confluent-kafka Python. Replaced them with the built-in `record_subject_name_strategy` and `topic_record_subject_name_strategy`, and left TopicNameStrategy as the default.
- The monitoring snippet used `time.time()` without importing `time`. Added the missing import.

## Review Notes
The examples still assume application-specific functions and classes such as `Order`, `process_order`, and `send_to_dlq`; that is acceptable for illustrative blog code, but a future revision could explicitly label those as application-defined placeholders. `SerializingProducer` and `DeserializingConsumer` are documented by Confluent as experimental, so production code may prefer using serializers and deserializers directly with the base producer/consumer APIs.
