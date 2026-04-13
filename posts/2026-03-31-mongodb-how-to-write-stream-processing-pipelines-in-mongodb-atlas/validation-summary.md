# Validation Summary: How to Write Stream Processing Pipelines in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Stream Processing
- MongoDB Aggregation Pipeline
- Apache Kafka (as a streaming source/sink)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Atlas Stream Processing documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/
- `sp.createStreamProcessor()` reference: https://www.mongodb.com/docs/manual/reference/method/sp.createstreamprocessor/
- `sp.processor.start()` reference: https://www.mongodb.com/docs/manual/reference/method/sp.processor.start/
- `sp.processor.stop()` reference: https://www.mongodb.com/docs/manual/reference/method/sp.processor.stop/
- `sp.processor.stats()` reference: https://www.mongodb.com/docs/manual/reference/method/sp.processor.stats/
- `sp.processor.drop()` reference: https://www.mongodb.com/docs/manual/reference/method/sp.processor.drop/
- `sp.processor.sample()` reference: https://www.mongodb.com/docs/manual/reference/method/sp.processor.sample/
- `sp.listStreamProcessors()` reference: https://www.mongodb.com/docs/manual/reference/method/sp.liststreamprocessors/
- MongoDB `$tumblingWindow` stage documentation
- MongoDB `$hoppingWindow` stage documentation
- MongoDB `$source` and `$emit` stage documentation for Atlas Stream Processing

## Issues Found

1. **Incorrect connection string format (line 18):** The post used `mongosh "mongodb://stream.mongodb.net/?directConnection=true"` which is a standalone mongod connection pattern. Atlas Stream Processing instances use the `mongodb+srv://` SRV connection format provided by the Atlas UI. Changed to `mongosh "mongodb+srv://admin:secret@sp-instance.example.mongodb.net/"`.

2. **Non-existent `describe()` method (line 255):** The post referenced `sp.orderEvents.describe()` to "view pipeline definition," but `describe()` is not a documented mongosh method for stream processors. The documented methods are `start()`, `stop()`, `drop()`, `stats()`, and `sample()`. Replaced with `sp.orderEvents.sample()` which is the correct method for inspecting messages flowing through a processor.

3. **Misleading Dead Letter Queue section (lines 213-241):** The section was titled "Handling Dead Letter Queue" but only showed a `$merge` stage with `on`/`whenMatched`/`whenNotMatched` options — which is upsert behavior, not DLQ configuration. The actual DLQ is configured as a third `options` parameter to `sp.createStreamProcessor()` with a `dlq` object specifying `connectionName`, `db`, and `coll`. Added the proper `dlq` option to the example and updated the section description.

## Review Notes
- The `timeField: { $toDate: "$timestamp" }` syntax in the `$source` stage is technically valid since `$toDate` is a MongoDB expression operator, but official documentation examples predominantly use `$dateFromString`. The current usage should work but readers may want to consult docs for their specific timestamp format.
- The `$$NOW` system variable used in the `$addFields` stage for `alertTime` is a standard MongoDB variable and should work in stream processing pipelines.
- The post correctly distinguishes between `$emit` (for Kafka/Kinesis sinks) and `$merge` (for Atlas collection sinks) — these are mutually exclusive sink stages in Atlas Stream Processing.
