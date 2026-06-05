# Validation Summary: How to Monitor Go Connection Pools with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go `database/sql`
- Go OpenTelemetry Metrics API and SDK
- OTLP metric exporter over gRPC
- OpenTelemetry database client metric semantic conventions
- PostgreSQL via `github.com/lib/pq`

## Sources Consulted
- Go `database/sql` package documentation: https://pkg.go.dev/database/sql
- OpenTelemetry Go `metric` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go `sdk/metric` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go OTLP metric gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry database client metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The post said database drivers expose pool statistics, but the examples use Go's `database/sql` pool stats from `sql.DBStats`. Updated the wording to refer to database libraries such as `database/sql`.
- The architecture diagram labeled wait duration as a histogram while the code records cumulative wait duration as a counter delta. Updated the diagram label to "Wait Duration Counter".
- The metric section claimed all metric instruments followed OpenTelemetry semantic conventions, but most `db.pool.*` names are custom and current OpenTelemetry database connection-pool conventions use names such as `db.client.connection.wait_time` with `db.client.connection.pool.name`. Clarified which metrics are custom, renamed the acquisition histogram to `db.client.connection.wait_time`, and updated relevant attributes to `db.client.connection.pool.name` and `db.system.name`.
- Wait duration and acquisition duration used milliseconds while the current OpenTelemetry database connection-pool semantic convention uses seconds for wait-time histograms. Changed those examples to record seconds.
- The connection acquisition wrapper timed `DB.QueryContext`, `DB.ExecContext`, and `DB.BeginTx`, which includes query/statement execution work and does not isolate pool acquisition. Updated the sample to measure `DB.Conn(ctx)` acquisition directly, then use the acquired `sql.Conn` for query, exec, and transaction examples.
- The query wrapper needed to keep the dedicated `sql.Conn` open while rows are consumed. Added an `InstrumentedRows` wrapper that closes the connection when rows are closed.
- The transaction wrapper needed to return the dedicated `sql.Conn` to the pool when the transaction finishes. Added an `InstrumentedTx` wrapper that closes the connection after commit or rollback.
- The utilization logging divided by configured pool limits without guarding for zero values. Since `SetMaxOpenConns(0)` means unlimited and `SetMaxIdleConns(0)` retains no idle connections, added guards before calculating percentages.
- `NewInstrumentedDB` did not close the opened `sql.DB` after a failed `Ping`. Added `db.Close()` on that error path.
- The health-check snippet used counter fields without showing how they were initialized. Added a `NewPoolHealthChecker` constructor that creates the counters.
- Updated the OpenTelemetry semantic convention import from `v1.21.0` to `v1.41.0` to match current documentation examples.

## Review Notes
The OpenTelemetry Go Metrics API usage for counters, gauges, histograms, `metric.WithAttributes`, the OTLP gRPC metric exporter, and `sdkmetric.NewPeriodicReader` matches current official package documentation. I could not run a local Go compile check because the `go` command is not installed in this environment; validation was performed against official documentation.
