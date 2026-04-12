# Validation Summary: How to Use Window Functions in Atlas Stream Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Stream Processing
- Apache Kafka (as source/sink connector)
- `$tumblingWindow` aggregation stage
- `$hoppingWindow` aggregation stage
- `$source`, `$merge`, `$emit` stream processing stages

## Sources Consulted
- MongoDB Atlas Stream Processing documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/
- MongoDB `$tumblingWindow` reference: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-tumbling/
- MongoDB `$hoppingWindow` reference: https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-hopping/
- MongoDB DEV Community article on windowed streaming: https://dev.to/mongodb/aggregate-streaming-data-within-windows-of-time-using-atlas-stream-processing-1lm1
- MongoDB official ASP_example GitHub repository: https://github.com/mongodb/ASP_example

## Issues Found

### Issue 1: Incorrect parameter name `hop` in `$hoppingWindow`
- **What was wrong:** The hopping window example used `hop: { size: 30, unit: "second" }` as the parameter name.
- **What was changed:** Renamed `hop` to `hopSize`, which is the correct parameter name per the official documentation.
- **Why:** The official MongoDB documentation and example repositories consistently use `hopSize`, not `hop`.

### Issue 2: `$setWindowFields` is not supported in Atlas Stream Processing
- **What was wrong:** The post included an entire section showing `$setWindowFields` used in a stream processing pipeline. Atlas Stream Processing does not support the `$setWindowFields` operator.
- **What was changed:** Replaced the section with a correct example using `$tumblingWindow` with `$group` for event aggregation by user. Added a note clarifying that `$setWindowFields` is a standard MongoDB aggregation stage not available in stream processing pipelines.
- **Why:** Per official MongoDB documentation, `$setWindowFields` is not a supported stage in Atlas Stream Processing. Only `$tumblingWindow` and `$hoppingWindow` are available for windowed computations.

### Issue 3: Empty `$emit: {}` stage is invalid
- **What was wrong:** The hopping window example used `$emit: {}` with an empty object as the sink stage.
- **What was changed:** Replaced with `$emit: { connectionName: "outputKafka", topic: "rolling-averages" }` to show the required connection details.
- **Why:** The `$emit` stage requires at minimum a `connectionName` and `topic` (for Kafka sinks) or `connectionName`, `db`, `coll`, and `timeseries` (for time series collection sinks). An empty object is not a valid configuration.

### Issue 4: Introductory text and summary referenced `$setWindowFields`
- **What was wrong:** The intro paragraph listed `$setWindowFields` as one of the window function operators, and the summary section recommended using it.
- **What was changed:** Removed `$setWindowFields` references from the intro and summary, keeping only `$tumblingWindow` and `$hoppingWindow` as the stream processing window operators.
- **Why:** Consistency with the section removal and technical accuracy.

## Review Notes
- The Atlas CLI command `atlascli streams connection create --type kafka --name myKafkaSource` shown in a comment is a reasonable representation but users should verify exact flags against their Atlas CLI version.
- The `$tumblingWindow` and `$hoppingWindow` stages also support optional `allowedLateness` and `idleTimeout` parameters for handling late-arriving data, which could be a useful addition in a future update.
