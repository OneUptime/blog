# Validation Summary: How to Handle Schema Evolution with Kafka and Avro

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Kafka
- Apache Avro
- Confluent Schema Registry
- Confluent Kafka Avro Serializer and Deserializer
- Docker Compose
- Java
- Maven
- Schema Registry REST API
- Python requests

## Sources Consulted
- Apache Avro 1.11.1 Specification: https://avro.apache.org/docs/1.11.1/specification/
- Confluent Schema Evolution and Compatibility documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Schema Registry API Reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Avro serializer/deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html
- Confluent Schema Registry Configuration Reference: https://docs.confluent.io/platform/current/schema-registry/installation/config.html
- Confluent Docker Image Configuration Reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Java Client for Apache Kafka documentation: https://docs.confluent.io/kafka-clients/java/current/overview.html
- Apache Kafka producer configuration documentation: https://kafka.apache.org/41/configuration/producer-configs/

## Issues Found
- The Docker Compose example advertised only `localhost:9092` from the broker. This works for host clients but causes containers such as Schema Registry to receive an unusable broker address. Updated the example to use separate internal and host listeners and pointed Schema Registry at the internal listener.
- The producer snippet described `use.latest.version=false` as a specific Avro reader setting. That option controls whether the serializer uses the latest registered subject schema. Updated the comment to describe the actual behavior.
- The consumer snippet described `specific.avro.reader=false` as using a specific reader. That value returns generic records, not generated `SpecificRecord` classes. Updated the comment.
- The schema evolution Java example omitted required imports and created a `GenericDatumReader` without actually reading encoded data. Added imports and a minimal binary encode/decode flow so the example demonstrates default application during Avro schema resolution.
- The field deprecation and type evolution Java snippets omitted required imports. Added the imports needed for the shown classes to compile in isolation.
- The type evolution union example could imply that old readers can consume all new union branches. Added a note that consumers expecting only `double` must be updated before producers write `long` or `string` values.
- The final compatibility test command used `--data @new-schema.json`, which is ambiguous because Schema Registry expects a request object containing a serialized `schema` string. Renamed the placeholder to `compatibility-request.json` to match the API shape used earlier in the post.

## Review Notes
The post uses Confluent Platform 7.5.0, Kafka clients 3.6.0, and Avro 1.11.3. These versions are not current as of the review date, but the APIs and compatibility concepts used in the article remain valid for the versions shown. For a future refresh, consider updating the dependency and container versions together and adding a short note about transitive compatibility modes.
