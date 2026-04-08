# Validation Summary: How to Connect Atlas Stream Processing to Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Stream Processing
- Apache Kafka
- MongoDB Atlas CLI
- MongoDB Aggregation Pipeline (streaming extensions: $source, $emit, $tumblingWindow, $merge)

## Sources Consulted
- MongoDB Atlas CLI `atlas streams connections create` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-streams-connections-create/
- Atlas Stream Processing `$source` stage documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-source/
- Atlas Stream Processing `$emit` stage documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-emit/
- Atlas Stream Processing `$tumblingWindow` stage documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-tumbling/
- Atlas Stream Processing `$merge` stage documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-merge/
- Atlas Stream Processing workspace management: https://www.mongodb.com/docs/atlas/atlas-stream-processing/manage-processing-instance/
- Atlas Stream Processing Avro/Schema Registry support announcement: https://www.mongodb.com/company/blog/product-release-announcements/atlas-stream-processing-supports-apache-avro-with-schema-registry
- Atlas Stream Processing stream processor management: https://www.mongodb.com/docs/atlas/atlas-stream-processing/manage-stream-processor/
- Atlas streams instances CLI reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-streams-instances/

## Issues Found

1. **Incorrect CLI command flags for creating Kafka connections**: The post used fabricated individual flags (`--type`, `--name`, `--bootstrapServers`, `--security.protocol`, `--sasl.mechanism`, `--sasl.username`, `--sasl.password`) that do not exist in the Atlas CLI. The actual `atlas streams connections create` command requires a `--file` flag pointing to a JSON configuration file. Fixed by replacing the command with the correct two-step process: create a JSON config file, then pass it via `--file`.

2. **Incorrect prerequisite tier**: The post stated "M10 or higher" is needed. Atlas Stream Processing uses its own SP tier system (SP10, SP30, SP50) independent of database cluster tiers (M10, M20, etc.). Changed to "SP10 or higher tier" with "workspace" instead of "instance" to match current terminology.

3. **Non-existent CLI commands for monitoring**: The post listed `atlas streams pipelines list` and `atlas streams pipelines describe` which do not exist. The correct CLI commands are `atlas streams instances list` and `atlas streams instances describe`. Individual stream processors are managed via `mongosh` (e.g., `sp.listStreamProcessors()`). Replaced with correct commands and added `mongosh` examples.

4. **Outdated Avro/Protobuf guidance**: The post recommended using `$function` to decode Avro or Protobuf messages. MongoDB now supports native Avro deserialization via Schema Registry integration in the `$source` stage. Updated to reflect native Schema Registry support for Avro and removed the incorrect `$function` suggestion.

## Review Notes
- The `$source`, `$emit`, `$tumblingWindow`, and `$merge` stage syntax and usage are correct and match official documentation.
- The `timeField` usage with `$dateFromString` is consistent with documented examples, though the `$$ROOT` prefix style is less common in official examples (simple field path strings like `"fullDocument.timestamp"` are more typical).
- The `$toDate` usage in `timeField` for epoch millisecond conversion is a reasonable pattern but not explicitly shown in official documentation.
