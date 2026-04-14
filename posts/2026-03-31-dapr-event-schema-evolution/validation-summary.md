# Validation Summary: How to Handle Event Schema Evolution with Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Pub/Sub
- Apache Avro
- Confluent Schema Registry
- Protocol Buffers (Protobuf)
- Dapr Python SDK
- GitHub Actions CI/CD
- Docker

## Sources Consulted
- Apache Avro 1.12.0 Specification: https://avro.apache.org/docs/1.12.0/specification/
- Confluent Schema Registry REST API Reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Registry API Usage Examples: https://docs.confluent.io/platform/current/schema-registry/develop/using.html
- Confluent CLI Tools Reference: https://docs.confluent.io/platform/current/tools/cli-reference.html
- Dapr Python SDK Documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK Source (dapr/python-sdk on GitHub): https://github.com/dapr/python-sdk
- Protocol Buffers Language Guide (proto3): https://protobuf.dev/programming-guides/proto3/
- AVRO-1340 (Enum default values for new symbols): https://issues.apache.org/jira/browse/AVRO-1340

## Issues Found

### 1. Incorrect enum evolution claim (line 19)
**What was wrong:** The post stated "Adding new enum values at the end" is a safe/backward-compatible change. In Avro, adding enum symbols is NOT backward-compatible unless the reader schema specifies an enum `"default"` value (a feature added in Avro 1.9.0). The position of the new symbol (at the end or otherwise) is irrelevant to compatibility — only whether the reader schema recognizes the symbol matters.

**What was changed:** Updated the bullet to read: "Adding new enum values (in Avro, only if the reader schema specifies an enum default)" to clarify the Avro-specific caveat.

### 2. Incorrect CI workflow for schema compatibility checking (lines 165-171)
**What was wrong:** The CI step used `kafka-avro-console-producer --schema-compatibility BACKWARD` inside the Schema Registry Docker image. This is incorrect on two counts: (a) `kafka-avro-console-producer` is a tool for producing Avro-encoded messages to Kafka topics, not for checking schema compatibility; (b) `--schema-compatibility` is not a valid flag for this tool.

**What was changed:** Replaced the CI step with a correct approach that uses the Confluent Schema Registry REST API — the same API the post already demonstrated earlier. The new workflow starts the Schema Registry, registers a baseline schema, then uses the `/compatibility/subjects/{subject}/versions/latest` endpoint to validate that the evolved schema is compatible. The result is checked with `jq` to fail the CI step if compatibility fails.

## Review Notes
- The Python import `import dapr.clients as dapr` is functional but unconventional. The idiomatic Dapr Python SDK import is `from dapr.clients import DaprClient`. This is a style preference, not a correctness issue, so it was left unchanged.
- The Confluent Schema Registry image tag `7.5.0` is a valid release but not the latest. This is acceptable as the APIs used are stable across versions.
- The Protobuf section is correct — proto3 fields are implicitly optional, and the advice about never reusing field numbers aligns with the official Protocol Buffers documentation.
- The Avro union type `["null", "string"]` with `"default": null` is the canonical pattern for optional fields in Avro and is correctly demonstrated.
- The Schema Registry REST API calls (endpoints, content types, request body format) are all correct per Confluent's official documentation.
