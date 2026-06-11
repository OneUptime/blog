# Validation Summary: How to Build Kafka Schema Registry Evolution

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Kafka
- Confluent Schema Registry
- Apache Avro
- Docker Compose
- Java Kafka producers with Confluent Avro serializers
- Python confluent-kafka serializers and Schema Registry client
- GitHub Actions

## Sources Consulted
- Confluent Schema Registry schema evolution and compatibility documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Schema Registry REST API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Registry serializers/deserializers documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html
- Confluent Avro serializer/deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Apache Avro 1.11.1 specification: https://avro.apache.org/docs/1.11.1/specification/
- Apache Kafka quickstart and kafka-topics usage: https://kafka.apache.org/quickstart/
- Confluent Kafka listener configuration documentation: https://docs.confluent.io/platform/current/kafka/listeners.html
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html

## Issues Found
- Fixed the BACKWARD, FORWARD, and FULL compatibility rule summaries. The original text incorrectly required defaults for forward-compatible added fields and overstated deletion rules; the corrected text follows Avro reader/writer resolution semantics and Confluent compatibility definitions.
- Fixed the Docker Compose Kafka listener configuration. The original single advertised listener used `localhost`, which would break Schema Registry from inside Docker. The updated example uses separate internal and host listeners and points Schema Registry at the internal listener.
- Fixed the Java serializer comment for `use.latest.version`. The property uses the latest registered schema version; it is not a specific schema ID setting.
- Fixed the Python producer configuration example. `value.serializer` belongs to `SerializingProducer`, not the plain `Producer` class, so the import and instantiation were corrected.
- Fixed the compatibility-check and registration curl examples. The original Avro field default was incorrectly nested inside the field's `type` object; it now uses a field-level `default`.
- Fixed the schema evolution workflow diagram so it no longer hard-codes consumers before producers for every compatibility mode.
- Fixed the enum guidance. The original note said a new enum default was required for BACKWARD compatibility; Avro enum defaults are reader-side fallbacks for unknown writer symbols, which matters for forward compatibility when the reader schema already has the fallback.
- Fixed the numeric type promotion example. Changing `int` to `long` is backward compatible via Avro promotion, not full compatible.
- Fixed the topic-migration registration command so it sends the Schema Registry API's expected JSON wrapper with an escaped schema string.
- Fixed the schema aliasing section wording. The example used Avro aliases, not Schema Registry schema references.
- Clarified the union-type migration example to state that named schemas must be defined or registered as schema references.
- Fixed the Python compatibility test import by adding `Schema`.
- Changed commented JSON examples to `jsonc` fences so they are not presented as strict JSON.

## Review Notes
- The Python `SerializingProducer` API is currently documented as experimental by Confluent. The example is correct for the shown `value.serializer` configuration, but future revisions could show direct serializer invocation with the plain `Producer` to avoid experimental API caveats.
