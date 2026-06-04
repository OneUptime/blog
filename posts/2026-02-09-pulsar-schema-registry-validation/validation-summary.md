# Validation Summary: How to Implement Pulsar Schema Registry for Message Format Validation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Pulsar schema registry
- Apache Pulsar Python client
- Apache Pulsar Go client
- Apache Pulsar Java client
- Pulsar Admin CLI and REST API
- Avro, JSON, Protobuf, and primitive schemas
- PrometheusRule alert configuration

## Sources Consulted
- Apache Pulsar client schema documentation: https://pulsar.apache.org/docs/client-libraries/schema/
- Apache Pulsar schema evolution and compatibility documentation: https://pulsar.apache.org/docs/2.10.x/schema-evolution-compatibility/
- Apache Pulsar schema management documentation: https://pulsar.apache.org/docs/4.0.x/admin-api-schemas/
- Apache Pulsar admin CLI reference: https://pulsar.apache.org/docs/4.0.x/reference-pulsar-admin/
- Apache Pulsar Go client documentation: https://pulsar.apache.org/docs/2.10.x/client-libraries-go/
- Apache Pulsar Go package API documentation: https://pkg.go.dev/github.com/apache/pulsar-client-go/pulsar
- Apache Pulsar Python schema API documentation: https://pulsar.apache.org/api/python/2.10.x/pulsar/schema/schema.html
- Apache Pulsar Prometheus metrics documentation: https://pulsar.apache.org/docs/3.0.x/reference-metrics/
- Apache Pulsar OpenTelemetry metrics documentation: https://pulsar.apache.org/docs/4.2.x/reference-metrics-opentelemetry/

## Issues Found
- The primitive Python example used `String()` as a top-level schema. Changed it to `StringSchema()`, which is the documented schema for UTF-8 strings in the Python client.
- The Go section claimed to show Avro but used `NewJSONSchema`, omitted the `context` import, and sent the struct value instead of a pointer. Updated it to use `NewAvroSchema`, added `context`, aligned Avro field names with the Go struct, and sent `&user`.
- The schema evolution explanation said V2 producers can send to V1 consumers under backward compatibility. Clarified the distinction between backward, forward, and full compatibility.
- The namespace compatibility CLI example had less portable option ordering. Updated it to pass `--compatibility BACKWARD` before the namespace.
- The validation commands used unsupported `pulsar-admin schemas list` and `pulsar-admin schemas test-compatibility` subcommands. Replaced them with documented `schemas get --version` usage and guidance to test through a producer or non-production upload.
- The custom schema example used `time.time()` without importing `time` and did not initialize the base `Schema` class. Added the missing import and base initializer.
- The schema management section included an unsupported `schemas list public/default` command. Removed it.
- The multi-language Avro example used Python snake_case fields and an integer timestamp while the Java consumer expected camelCase fields and `Long`. Aligned the Python and Java field names and changed the Python field to `Long`.
- The Prometheus alert examples referenced non-documented metric names. Replaced them with documented schema metrics, `pulsar_schema_put_ops_failed_total` and `pulsar_schema_incompatible_total`, and renamed the put-failure alert so it no longer implies message-level schema validation errors.

## Review Notes
The post remains a practical overview rather than a complete deployable application. Some snippets still assume surrounding setup, such as a running Pulsar cluster, existing imports in Java examples, and an available admin client for programmatic stats.
