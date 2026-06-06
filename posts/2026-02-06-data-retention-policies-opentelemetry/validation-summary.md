# Validation Summary: How to Set Up Data Retention Policies for OpenTelemetry Traces, Metrics,

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector routing connector
- OTLP HTTP exporter
- ClickHouse TTL and materialized views
- Elasticsearch Index Lifecycle Management (ILM)
- Python requests

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transformation and filtering documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry OTTL functions documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry OTTL span context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OpenTelemetry Collector routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- ClickHouse TTL documentation: https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse data lifecycle TTL guide: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse date/time functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- Elasticsearch ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch ILM force merge documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-forcemerge

## Issues Found
- The OpenTelemetry Collector filter processor example used the older `traces.span` configuration shape and referenced `end_time_unix_nano` without the `span.` context prefix. Updated it to the current `trace_conditions` form with `span.end_time_unix_nano`.
- The OTTL expression called `UnixNano()` without an argument. Updated it to `UnixNano(Now())`, matching the documented converter/function signatures.
- The ClickHouse downsampling query used `toStartOfFiveMinutes`, which is not a documented ClickHouse date/time function. Replaced it with `toStartOfInterval(Timestamp, INTERVAL 5 MINUTE)`.
- The ClickHouse metrics comments said raw metrics were kept for 30 days while the SQL retained them for 90 days. Updated the comment to match the SQL.
- The service-specific routing example used routing processor-style fields (`from_attribute`, `default_exporters`, and exporter targets in the routing table). Replaced it with the current routing connector structure using `connectors`, `default_pipelines`, `condition`, and destination pipelines.
- The Python retention checker used `datetime.utcnow()`, which is deprecated in current Python. Updated it to `datetime.now(timezone.utc)`, formatted the cutoff for ClickHouse, and added `raise_for_status()` before parsing the response.

## Review Notes
The retention periods are operational recommendations rather than OpenTelemetry requirements. The ClickHouse schema is intentionally simplified for an example; production OpenTelemetry schemas may require backend-specific table and column names.
