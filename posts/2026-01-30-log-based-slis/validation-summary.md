# Validation Summary: How to Build Log-Based SLIs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Structured JSON logging
- Service Level Indicators and Service Level Objectives
- PostgreSQL-style SQL aggregation and ordered-set aggregates
- ClickHouse-style log analytics queries
- Python
- OpenTelemetry Collector
- OneUptime OTLP log ingestion

## Sources Consulted
- PostgreSQL documentation: aggregate `FILTER` clauses and `percentile_cont` ordered-set aggregates: https://www.postgresql.org/docs/current/sql-expressions.html
- Python documentation: `datetime` and typing behavior: https://docs.python.org/3/library/datetime.html
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector `json_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- ClickHouse `countIf` documentation: https://clickhouse.com/docs/examples/aggregate-function-combinators/countIf
- ClickHouse date and time functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions

## Issues Found
- The Python sample imported `statistics` but did not use it, and `process_log` was annotated as returning `dict` even though parse failures return `None`. Removed the unused import and changed the return type to `Optional[dict]`.
- The Python percentile helper used `int(len(data) * percentile)`, which returns a nearest-rank-style element and does not match the continuous percentile calculation used by the SQL `PERCENTILE_CONT` example. Updated it to interpolate between adjacent sorted values.
- The Python section claimed the sample emits metrics, but the code only calculates and returns SLI values. Updated the text and docstring to say the values can be exported as Prometheus or OpenTelemetry metrics.
- The OpenTelemetry Collector section claimed the shown pipeline extracts or derives metrics from logs, but the configuration only parses, transforms, batches, and exports log records. Updated the wording to describe log normalization for downstream SLI queries.
- The OneUptime Collector exporter example used the generic `otlp` exporter, while OneUptime's current documentation shows `otlphttp` with JSON encoding and the `x-oneuptime-token` header. Updated the exporter to `otlphttp`, added `encoding: json`, added the JSON content type header, and updated the logs pipeline exporter reference.

## Review Notes
The SQL examples are dialect-specific: the first two examples use PostgreSQL syntax, while the OneUptime query uses ClickHouse-style functions such as `toStartOfMinute` and `countIf`. This is technically valid in context, but future edits could label the dialects more explicitly.
