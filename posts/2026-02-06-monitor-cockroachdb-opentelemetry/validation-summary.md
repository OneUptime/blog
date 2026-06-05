# Validation Summary: How to Monitor CockroachDB with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- CockroachDB
- OpenTelemetry Collector
- Prometheus metrics scraping
- OpenTelemetry Protocol (OTLP)
- Go
- pgx / pgxpool
- OpenTelemetry Go SDK
- PostgreSQL-compatible database client instrumentation

## Sources Consulted
- CockroachDB Prometheus endpoint documentation: https://www.cockroachlabs.com/docs/stable/prometheus-endpoint
- CockroachDB metrics reference: https://www.cockroachlabs.com/docs/stable/metrics
- CockroachDB Prometheus monitoring guide: https://www.cockroachlabs.com/docs/stable/monitor-cockroachdb-with-prometheus
- CockroachDB essential self-hosted metrics: https://www.cockroachlabs.com/docs/stable/essential-metrics-self-hosted
- CockroachDB storage layer documentation: https://www.cockroachlabs.com/docs/stable/architecture/storage-layer
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector OTLP gRPC exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector groupbyattrs processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry datapoint OTTL context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottldatapoint/README.md
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/sql/
- pgxpool package documentation: https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Collector filter used the older include-style filter processor configuration. Updated it to the current OTTL `metric_conditions` format, which drops metrics that do not match the intended CockroachDB metric allowlist.
- The exporter block used the gRPC `otlp` exporter with an HTTP OneUptime endpoint. Updated it to the OTLP HTTP exporter with JSON encoding and an ingestion token header, matching OneUptime's documented Collector configuration.
- The post referenced `sql_distsql_queries_active`, which is not listed in the current CockroachDB metrics reference. Replaced it with `sql_statements_active`, the documented metric for currently active user SQL statements.
- The filter referenced `replicas_quiescent` and `replicas_leaders`, which are not current documented CockroachDB metric names. Replaced them with documented metrics such as `replicas`, `replicas_leaseholders`, and `ranges_underreplicated`.
- The transform processor example used unqualified datapoint paths (`attributes` and `value_int`). Updated it to current OTTL datapoint paths: `datapoint.attributes` and `datapoint.value_double`.
- The Step 4 text claimed the configuration computed a distributed query ratio, but the snippet only tagged high read amplification and grouped by node. Updated the text to match the actual configuration.
- The Go tracing example used older database semantic convention attributes (`db.statement`, `db.system`, `db.name`). Updated them to stable database semantic convention attributes (`db.query.text`, `db.system.name`, `db.namespace`).
- The Go example embedded a literal query value in the SQL string. Updated it to a parameterized query with pgx arguments.
- The Go example did not close the connection pool. Added `defer pool.Close()`.
- The dashboard referenced quiescent replicas and slow query count without matching documented metrics in the post. Updated those labels to `Replica Leaseholders` and `SQL Failures Count`.
- The latency alert referred to a concrete `sql_exec_latency_p99` metric name. Updated it to describe a p99 calculation over `sql_exec_latency`.

## Review Notes
The Go example was reviewed against current OpenTelemetry semantic convention documentation, but it was not compiled locally because the environment does not have the `go` binary installed. The Collector example assumes `ONEUPTIME_TOKEN` is set in the collector environment.
