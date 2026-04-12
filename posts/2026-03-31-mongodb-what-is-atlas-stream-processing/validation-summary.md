# Validation Summary: What Is MongoDB Atlas Stream Processing

## Status
validated

## Post Type
Guide / Technical Overview

## Technologies Covered
- MongoDB Atlas Stream Processing (ASP)
- Apache Kafka
- MongoDB Aggregation Pipelines
- Atlas Change Streams
- mongosh

## Sources Consulted
- MongoDB Atlas Stream Processing Overview: https://www.mongodb.com/docs/atlas/atlas-stream-processing/overview/
- `$source` Stage Reference: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-source/
- `$merge` Stage (Stream Processing): https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-merge/
- `$emit` Stage Reference: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-emit/
- `$tumblingWindow` Stage Reference: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-tumbling/
- `$hoppingWindow` Stage Reference: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-hopping/
- `sp.createStreamProcessor()` Reference: https://www.mongodb.com/docs/manual/reference/method/sp.createstreamprocessor/
- Manage Stream Processors: https://www.mongodb.com/docs/atlas/atlas-stream-processing/manage-stream-processor/
- Manage Connection Registry: https://www.mongodb.com/docs/atlas/atlas-stream-processing/manage-connection-registry/

## Issues Found

1. **Stream processor definition format was incorrect.** The post showed a JSON object with top-level `source`, `pipeline`, and `sink` fields. In reality, `$source` and `$merge`/`$emit` are aggregation pipeline stages within the pipeline array, and processors are created via `sp.createStreamProcessor(name, pipeline, options)` in mongosh. Fixed to show the correct `sp.createStreamProcessor()` format with `$source` as the first stage and `$merge` as the last stage.

2. **Kafka source config used dot notation (`group.id`, `auto.offset.reset`) instead of underscores.** Atlas Stream Processing uses `group_id` and `auto_offset_reset` (underscores, not dots). Removed these from the example since they were also unnecessary for the illustration.

3. **"Atlas App Services" was incorrectly referenced for Kafka connections.** Kafka connections are configured through the Stream Processing instance's Connection Registry (via Atlas UI or Atlas CLI), not Atlas App Services (which is a different product). Fixed the description.

4. **Dead Letter Queue (DLQ) was listed as a sink type.** The DLQ is a separate configuration option passed as the third argument to `sp.createStreamProcessor()`, not a sink stage in the pipeline. Moved it to its own entry in the Core Concepts section with correct description.

5. **`writeConcern` was shown in the sink/merge config.** The ASP version of `$merge` does not support `writeConcern`. Its documented fields are `into`, `on`, `let`, `whenMatched`, `whenNotMatched`, and `parallelism`. Removed `writeConcern` from the example.

6. **Change stream source used a standalone JSON object format.** Updated to use the correct `$source` pipeline stage format and removed the `startAfter: {}` config which was shown as an empty object.

## Review Notes
- The `$tumblingWindow` and `$hoppingWindow` syntax shown in the Windowed Aggregations section is correct per the official documentation.
- The Kafka connection JSON shown in the "Connecting to Kafka" section is illustrative. The exact field names may vary depending on whether the connection is created via the Atlas UI, CLI, or Admin API.
- The post could benefit from mentioning that `$emit` is used for Kafka sinks while `$merge` is used for Atlas collection sinks, but this distinction is implicit from the corrected Core Concepts section.
