# Validation Summary: How to Enforce Schemas with Schema Registry in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Confluent Schema Registry
- Apache Avro
- JSON Schema
- Protocol Buffers
- Java Kafka producer and consumer clients
- Docker / Docker Compose configuration
- Schema Registry REST API

## Sources Consulted
- Confluent Schema Registry Configuration Reference: https://docs.confluent.io/platform/current/schema-registry/installation/config.html
- Confluent Schema Registry REST API Reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Registry serializers and supported formats: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html
- Confluent Schema Registry Avro serializer/deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html
- Confluent Schema Evolution and Compatibility Types: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Schema Registry production deployment guidance: https://docs.confluent.io/platform/current/schema-registry/installation/deployment.html
- Apache Kafka producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka consumer configuration reference: https://kafka.apache.org/41/configuration/consumer-configs/

## Issues Found
- The post said Schema Registry validates messages before they reach Kafka. Changed this to clarify that validation happens through Schema Registry-aware serializers on the producer side, not by Kafka brokers intercepting records.
- The Schema Registry deployment examples used Kafka bootstrap server values without security protocol prefixes. Updated them to `PLAINTEXT://kafka1:9092,PLAINTEXT://kafka2:9092`, matching the documented `kafkastore.bootstrap.servers` format.
- The multi-instance deployment example used `SCHEMA_REGISTRY_MASTER_ELIGIBILITY`, which is not the current documented configuration name. Updated it to `SCHEMA_REGISTRY_LEADER_ELIGIBILITY`.
- The Java examples configured Avro serializers/deserializers for keys while declaring `String` keys. Updated the key side to use Kafka `StringSerializer` and `StringDeserializer`, leaving Avro serialization for values.
- The consumer manually called `commitSync()` but did not disable Kafka auto-commit. Added `ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG` set to `false`.
- The schema compatibility test omitted the Avro namespace from the `User` record. Added `namespace: "com.example.events"` so the record fullname matches the registered schema.
- The schema evolution example referenced `Profile` without defining it or specifying a Schema Registry reference. Replaced it with the inline nested `Profile` record used earlier in the post.
- The explanation for adding an optional field mixed backward and forward compatibility reasoning. Adjusted it so backward compatibility is tied to the new reader default, and old-consumer behavior is described as forward compatibility.
- The compatibility table's `FORWARD` safe changes were slightly imprecise. Updated it to note that removing fields is safe when those fields had defaults.

## Review Notes
The post uses Confluent Platform image `7.5.0`, which is older than current Confluent Platform releases as of this review date. The examples remain valid after the fixes, but a future update could refresh the image tag and add security settings for production deployments.
