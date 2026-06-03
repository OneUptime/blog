# Validation Summary: How to Trace Database Queries from Kubernetes Pods Through Connection Pools

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- OpenTelemetry tracing and semantic conventions
- Grafana Tempo trace search
- Go
- pgx / pgxpool
- PostgreSQL

## Sources Consulted
- pgxpool package documentation: https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool
- pgx package documentation: https://pkg.go.dev/github.com/jackc/pgx/v5
- pgconn package documentation: https://pkg.go.dev/github.com/jackc/pgx/v5/pgconn
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/

## Issues Found
- The Go example mixed `database/sql` types with `pgx` APIs. `pgxpool.Conn.Query` returns `pgx.Rows`, `QueryRow` returns `pgx.Row`, and `Exec` returns `pgconn.CommandTag`, not `*sql.Rows` or `sql.Result`. Updated the code to use `pgx.Row` for the single-row handler example and `pgconn.CommandTag` for exec results.
- The handler example called `.Scan` on `db.QueryContext(...)`, but that function returned two values in the original snippet and would not compile. Updated the example to call `QueryRowContext(...).Scan(...)`.
- The original query example released the acquired pool connection before returned rows could be consumed. Updated the single-row example to release the connection after `Scan`.
- The OpenTelemetry database attributes used older names such as `db.system`, `db.operation`, and `db.statement`. Updated them to current semantic convention names: `db.system.name`, `db.operation.name`, and `db.query.text`.
- The Tempo API examples used a POST body shape that does not match the documented `/api/search` examples. Updated them to use `curl -G` with URL-encoded `q` and `minDuration` parameters.
- Removed an unused `fmt` import from the Go snippet.

## Review Notes
The article remains a manual instrumentation example. For production code, consider using maintained pgx/OpenTelemetry instrumentation where appropriate and avoid recording raw SQL text unless queries are sanitized or parameterized, because query text can expose sensitive data.
