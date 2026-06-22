# Validation Summary: How to Set Up Confluent Schema Registry

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Apache Kafka
- Confluent Schema Registry
- Docker Compose
- Avro
- Protobuf
- JSON Schema
- Java Kafka producers and consumers
- Confluent Schema Registry REST API

## Sources Consulted
- Confluent Schema Registry API Reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Registry Configuration Reference: https://docs.confluent.io/platform/current/schema-registry/installation/config.html
- Confluent Docker Image Configuration Reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Schema Evolution and Compatibility Types: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Avro Serializer and Deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html
- Confluent Protobuf Serializer and Deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-protobuf.html
- Confluent JSON Schema Serializer and Deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-json.html

## Issues Found
- The Docker Compose Kafka service only advertised `kafka:9092`, while the later examples connect from the host with `localhost:9092`. Added a host listener, listener security protocol map, inter-broker listener name, and port mapping so local Java clients can connect.
- The Schema Registry Docker configuration pointed to `kafka:9092`; updated it to `PLAINTEXT://kafka:29092` to match the internal Docker listener and Confluent's documented listener format.
- The configuration snippet used `kafkastore.topic.replication.factor=3` even though the setup shows a single-broker local cluster. Changed it to `1` so the `_schemas` topic can be created in that environment.
- The compatibility table used imprecise "optional fields" wording. Updated safe-change examples to match Confluent's documented backward, forward, and full compatibility behavior around fields with defaults.
- The Java Avro producer and consumer examples omitted required imports, and the producer did not handle checked exceptions from `send(...).get()`. Added the missing imports and `throws Exception`.
- The Protobuf serializer/deserializer snippet used unqualified class names without imports. Replaced them with fully qualified Confluent serializer class names.

## Review Notes
- The post uses Confluent Platform `7.5.0`, where the ZooKeeper-based local example is still plausible. For a future refresh, consider moving the Docker Compose example to KRaft-based Kafka because newer Confluent Platform versions have moved away from ZooKeeper.
