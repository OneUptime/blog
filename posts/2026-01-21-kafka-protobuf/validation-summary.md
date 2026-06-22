# Validation Summary: How to Use Protobuf with Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Protocol Buffers / Protobuf proto3
- Confluent Schema Registry
- Confluent Kafka Java Protobuf serializer/deserializer
- Confluent Kafka Python client
- Maven
- Schema Registry REST API

## Sources Consulted
- Confluent Protobuf Schema Serializer and Deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-protobuf.html
- Confluent Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Kafka Python Protobuf producer example: https://github.com/confluentinc/confluent-kafka-python/blob/master/examples/protobuf_producer.py
- Confluent Kafka Python Protobuf consumer example: https://github.com/confluentinc/confluent-kafka-python/blob/master/examples/protobuf_consumer.py
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/

## Issues Found
- The post claimed Protobuf messages are more compact than both JSON and Avro. Protobuf is generally more compact than JSON, but it is not categorically smaller than Avro for all schemas and payloads. Updated the claim to avoid an overgeneralized Avro comparison.
- The Python example used `SerializingProducer` and `DeserializingConsumer`, which Confluent documents as experimental and likely to be removed or changed. Updated the example to use the direct `Producer`/`Consumer` API with `ProtobufSerializer`, `ProtobufDeserializer`, and `SerializationContext`, matching Confluent's current examples.
- The Python producer did not explicitly pass `use.deprecated.format: False` to `ProtobufSerializer`, while Confluent's Protobuf examples include it for the current wire-format behavior. Added that configuration.
- The Python consumer created an unused `SchemaRegistryClient`. Removed it because `ProtobufDeserializer` can deserialize the known generated message type directly from the Confluent-framed payload in this example.

## Review Notes
- The Java producer and consumer configuration matches Confluent's documented `KafkaProtobufSerializer`, `KafkaProtobufDeserializer`, `schema.registry.url`, and `specific.protobuf.value.type` usage.
- The Schema Registry curl command uses the documented subject versions endpoint and correctly sets `schemaType` to `PROTOBUF`; omitting `schemaType` would default to Avro.
- The proto3 enum example correctly uses a zero-valued first enum member, as required by proto3.
