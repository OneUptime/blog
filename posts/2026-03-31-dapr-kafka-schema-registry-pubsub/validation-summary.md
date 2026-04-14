# Validation Summary: How to Configure Kafka Schema Registry with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (pub/sub building block, Kafka component)
- Apache Kafka
- Confluent Schema Registry (REST API, Docker image `cp-schema-registry:7.5.0`)
- Apache Avro (schema definition, serialization)
- Python (`confluent-kafka`, `flask`, `requests`, `base64`)
- Docker

## Sources Consulted
- Dapr Pub/Sub HTTP API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr raw payload pub/sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-raw/
- Dapr Kafka pub/sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Confluent Schema Registry REST API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Apache Avro specification: https://avro.apache.org/docs/current/specification/

## Issues Found
1. **rawPayload metadata passed as HTTP header instead of query parameter.** In the "Publishing with Avro Serialization" Python code, `metadata.rawPayload` was passed as an HTTP header (`headers={"metadata.rawPayload": "true"}`). Per Dapr's HTTP publish API documentation, metadata must be passed as URL query parameters (e.g., `?metadata.rawPayload=true`), not as headers. Fixed the URL to include `?metadata.rawPayload=true` and removed the metadata entry from headers.

## Review Notes
- The architecture diagram uses a `json` code fence language tag but the content is ASCII art, not JSON. This is cosmetic and does not affect technical correctness.
- The `serialize_avro` and `deserialize_avro` functions are called but never defined. The post treats them as pseudocode placeholders. Showing their implementations (using `confluent-kafka`'s `AvroSerializer`/`AvroDeserializer` or `fastavro`) would make the examples more complete.
- Several imports (`io`, `struct`, `AvroSerializer`) and the `schema_client` variable are declared but unused in the shown code. They are presumably intended for the undefined helper functions.
- All Schema Registry REST API calls (schema registration, compatibility checking, global config) are correct.
- The Dapr Kafka component YAML uses correct field names and values for `pubsub.kafka` v1.
- The Docker command for running Schema Registry with correct environment variables and port mapping is accurate for the `cp-schema-registry:7.5.0` image.
