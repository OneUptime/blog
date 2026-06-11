# Validation Summary: How to Build Event Schema Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Event-driven architecture
- Event schema design
- Apache Avro
- JSON Schema draft 2020-12
- Protocol Buffers proto3
- Schema Registry concepts
- OpenTelemetry trace correlation
- CloudEvents-style event metadata

## Sources Consulted
- Apache Avro specification: https://avro.apache.org/docs/1.11.1/specification/
- JSON Schema draft 2020-12 validation specification: https://json-schema.org/draft/2020-12/json-schema-validation
- Protocol Buffers proto3 language guide: https://protobuf.dev/programming-guides/proto3/
- Protocol Buffers encoding guide: https://protobuf.dev/programming-guides/encoding/
- Protocol Buffers best practices: https://protobuf.dev/best-practices/dos-donts/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
- Confluent Schema Registry schema evolution documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Schema Registry SerDes and schema format documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html
- Apicurio Registry content rules documentation: https://www.apicur.io/registry/docs/apicurio-registry/3.3.x/getting-started/assembly-intro-to-registry-rules.html

## Issues Found
- The full JSON event example used a 16-hex-character `trace_id` value. OpenTelemetry trace IDs are 16 bytes, typically represented as 32 lowercase hex characters; 16 hex characters is the span ID length. Updated the example `trace_id` to a 32-hex-character value.

## Review Notes
- The JSON Schema snippets are syntactically valid JSON. In draft 2020-12, `format` checks such as `uuid`, `date-time`, and `email` may require validator support for format assertion, so implementations should enable that where strict validation is expected.
- The Protobuf evolution table is directionally correct for binary compatibility; type changes such as `int32` to `int64` are conditionally wire-compatible and require careful rollout to avoid lossy reads by older consumers.
