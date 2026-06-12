# Validation Summary: How to Use Pulsar Schema Registry

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Apache Pulsar Schema Registry
- Pulsar Java client
- Pulsar Admin CLI and REST Admin API
- Avro schemas
- JSON schemas
- Protobuf schemas
- Schema compatibility and validation enforcement

## Sources Consulted
- Apache Pulsar Schema overview: https://pulsar.apache.org/docs/next/schema-overview/
- Apache Pulsar Understand schema: https://pulsar.apache.org/docs/next/schema-understand/
- Apache Pulsar Manage schemas: https://pulsar.apache.org/docs/next/admin-api-schemas/
- Apache Pulsar Admin CLI reference: https://pulsar.apache.org/docs/next/reference-pulsar-admin/
- Apache Pulsar Get started with schema: https://pulsar.apache.org/docs/next/schema-get-started/
- Apache Pulsar Java client API javadocs for `Schema`, `Message`, `GenericRecord`, and `SchemaInfo`: https://pulsar.apache.org/api/client/ and https://javadoc.io/doc/org.apache.pulsar/
- Apache Pulsar Java admin API javadocs for `Schemas`: https://pulsar.apache.org/api/admin/
- Protocol Buffers Java generated code guide: https://protobuf.dev/reference/java/java-generated/

## Issues Found
- Corrected the schema evolution compatibility table. Adding a field with a default is both backward and forward compatible for Avro-style schema evolution, and removing a field is backward compatible; the original table incorrectly marked several of these cases.
- Replaced the incorrect claim that `BACKWARD_TRANSITIVE` is the default strategy. Pulsar documentation states defaults vary by schema type; Avro and JSON default to `FULL`, while other types may default to no evolution.
- Corrected the compatibility mode list and diagram from `NONE` to Pulsar's documented `ALWAYS_COMPATIBLE`, and added `ALWAYS_INCOMPATIBLE`.
- Fixed a compatibility example that claimed removing a field breaks `BACKWARD` compatibility. The example now uses adding a required field without a default as the backward-incompatible change.
- Replaced incorrect schema enforcement policy names (`ALWAYS`, `ALWAYS_PRODUCER`, `DISABLED`) with Pulsar's documented boolean `schemaValidationEnforced` namespace setting.
- Removed an invalid `set-schema-autoupdate-strategy --schema-validation-enforced` command and replaced it with the documented schema validation enforcement and compatibility strategy commands.
- Replaced undocumented CLI examples using `schemas get --all-version`, `schemas compatibility`, and `--schema-file` with documented `schemas get`, `schemas get --version`, `schemas upload --filename`, and the REST compatibility endpoint.
- Fixed the Java auto-consume snippet to access schema metadata through `message.getReaderSchema()` rather than a nonexistent `message.getSchemaInfo()` method.
- Added missing Java imports for `BigDecimal`, `Instant`, `List`, `PulsarAdmin`, `SchemaCompatibilityStrategy`, and Avro `@Nullable` where snippets used those types.
- Added missing getters/setters in the schema evolution example so the sample code matches the method calls shown.
- Clarified that Java field initializers are not the same as Avro schema defaults by using optional fields and noting when a value will be `null` unless an explicit Avro default is declared.

## Review Notes
The examples remain tutorial snippets rather than a complete Maven project. A future improvement would be to provide a companion build file with explicit Pulsar, Avro, and Protobuf dependency versions and generated-code setup.
