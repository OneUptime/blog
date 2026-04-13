# Validation Summary: How to Set Up Atlas Stream Processing for Real-Time Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Stream Processing (ASP)
- Apache Kafka (as event source/sink)
- MongoDB Atlas Change Streams
- MongoDB Aggregation Pipeline
- Atlas CLI

## Sources Consulted
- MongoDB Atlas Stream Processing documentation (https://www.mongodb.com/docs/atlas/atlas-stream-processing/)
- MongoDB Atlas Stream Processing pipeline stage reference — `$source`, `$emit`, `$tumblingWindow`, `$hoppingWindow` (https://www.mongodb.com/docs/atlas/atlas-stream-processing/stream-aggregation/)
- MongoDB `$dateToString` aggregation operator reference (https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/)
- Atlas CLI `streams` command reference (https://www.mongodb.com/docs/atlas/cli/stable/command/atlas-streams/)

## Issues Found

1. **Incorrect sink stage `$merge` — changed to `$emit`**
   - **What was wrong:** The pipeline example used `$merge` with an `into` object containing `connectionName`, `db`, and `coll` fields as the sink stage. In Atlas Stream Processing, `$merge` is a standard MongoDB aggregation stage that does not support the `connectionName` field. The ASP-specific sink stage is `$emit`, which writes processed documents to a named connection (Atlas cluster or Kafka topic).
   - **What was changed:** Replaced the `$merge` stage with `$emit` and flattened the structure (removed the `into` wrapper, placing `connectionName`, `db`, and `coll` directly under `$emit`).
   - **Why:** `$emit` is the correct ASP operator for writing to output connections. Using `$merge` with `connectionName` would produce a pipeline validation error.

2. **Incorrect dead letter queue configuration field name and nesting**
   - **What was wrong:** The DLQ was configured as `config.deadLetterQueue` nested inside the `$source` stage. The correct field name is `dlq` and it sits directly on the `$source` object, not nested under a `config` wrapper.
   - **What was changed:** Changed `"config": { "deadLetterQueue": { ... } }` to `"dlq": { ... }` directly on the `$source` stage.
   - **Why:** The ASP `$source` stage uses `dlq` as the field name for dead letter queue configuration. Using `config.deadLetterQueue` would be silently ignored or cause a validation error.

## Review Notes
- The Atlas CLI commands shown (`atlas streams instances create`, `atlas streams connections create`, `atlas streams pipelines start/describe/stats`) use illustrative flag names that convey the correct concepts. The exact flag interface may vary by CLI version — in some versions, connection configuration is passed via `--file` with a JSON config rather than individual flags. Readers should consult `atlas streams --help` for their installed version.
- The `$dateToString` usage with `$$NOW` and no explicit `format` parameter is valid — it defaults to the ISO 8601 format `"%Y-%m-%dT%H:%M:%S.%LZ"`.
- The M10+ prerequisite is stated for the Atlas cluster, which is reasonable if using Atlas as a source/sink. However, Stream Processing Instances (SPIs) are billed independently with their own tier (SP30, SP50, etc.) and do not strictly require an M10+ cluster in the same project.
- The `$tumblingWindow` and `$hoppingWindow` syntax and explanations are accurate.
