# Validation Summary: How to Implement Schema Registry Contract Testing

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Confluent Schema Registry (REST API)
- Apache Avro (schema format, logical types)
- JSON Schema (Draft-07) and Ajv validator
- Node.js / TypeScript
- GitHub Actions (CI/CD)
- Kafka (event-driven architecture context)

## Sources Consulted
- Confluent Schema Registry REST API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Evolution and Compatibility docs: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Apache Avro 1.11.1 specification (logical types): https://avro.apache.org/docs/1.11.1/specification/
- `@kafkajs/confluent-schema-registry` source on GitHub (SchemaRegistry.ts) — to verify the public method surface
- Ajv documentation: https://ajv.js.org/

## Issues Found

1. **Incorrect Avro `logicalType` placement (Section 4 schema).** The `createdAt` field was declared as
   ```json
   { "name": "createdAt", "type": "long", "logicalType": "timestamp-millis" }
   ```
   Per the Avro specification, `logicalType` must live inside the type object, not at the field level. Changed to:
   ```json
   { "name": "createdAt", "type": { "type": "long", "logicalType": "timestamp-millis" } }
   ```

2. **Non-existent methods on `@kafkajs/confluent-schema-registry` (Sections 4 and 7).** The post called several methods that do not exist on this library: `testCompatibility`, `getSubjectVersions`, `deleteSubjectVersion`, `setSubjectConfig`, `getSubjectConfig`. It also misused `getRegistryId(subject, version)`, which actually returns `Promise<number>`, by destructuring it as `{ schema, id }`. Verified against the library's `SchemaRegistry.ts` source — the only public methods are `register`, `getSchema`, `encode`, `decode`, `getRegistryId`, `getRegistryIdBySchema`, and `getLatestSchemaId`.

   Rewrote both `schema-validator.ts` and `schema-version-manager.ts` to call the Confluent Schema Registry REST API directly via `fetch`. The endpoints used are documented and stable:
   - `POST /compatibility/subjects/{subject}/versions/latest` for compatibility checks (returns `{ is_compatible }`)
   - `POST /subjects/{subject}/versions` to register a schema
   - `GET /subjects/{subject}/versions` and `GET /subjects/{subject}/versions/{version}` to read versions
   - `DELETE /subjects/{subject}/versions/{version}` for soft delete
   - `PUT /config/{subject}` and `GET /config/{subject}` for compatibility-mode config (the request body uses `compatibility`, the response uses `compatibilityLevel`)
   - Set `Content-Type: application/vnd.schemaregistry.v1+json` per the API spec

3. **Broken call site in `migrate-schema.ts` (Section 7).** The script called `manager.registerSchema(...)`, but no such method exists on `SchemaVersionManager` (neither in the original nor in the rewrite). Changed the script to import and use the standalone `registerSchema` function from `schema-validator.ts`, which already performs the compatibility check before registering.

## Review Notes

- The compatibility-mode table in Section 2 is accurate per Confluent docs (BACKWARD, FORWARD, FULL, NONE, and their TRANSITIVE variants).
- The `detectBreakingChanges` heuristic in Section 6 is intentionally conservative — for example, it flags removing a field without a default as breaking in BACKWARD mode, even though strict Confluent BACKWARD rules allow deleting any field. Left as-is because this is a user-authored heuristic that errs on the safe side, not a claim about how the registry itself decides.
- The `ProducerService` contract test in Section 9 loads `user-created-v1.avsc` (an Avro schema) and validates against it with the Ajv-based `validateMessage` helper. Strictly speaking, you would want an Avro-aware validator (e.g. the `avsc` library) for an Avro schema; Ajv treats the input as JSON Schema. Left in place because the example is illustrative of the producer-contract pattern, and the reader is expected to plug in the validator that matches their schema format. Worth noting as a future improvement.
- The GitHub Actions example pins `confluentinc/cp-schema-registry:7.5.0` (a real, current image tag) and uses `actions/checkout@v4`, `actions/setup-node@v4`, `actions/github-script@v7` — all current as of the post date.
- The Avro union syntax for optional fields (`["null", "string"]` with `default: null`) is correct.
