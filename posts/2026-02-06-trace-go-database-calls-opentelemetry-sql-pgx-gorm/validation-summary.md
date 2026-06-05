# Validation Summary: How to Trace Go Database Calls with OpenTelemetry (database/sql, pgx, GORM)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- OpenTelemetry Go SDK and semantic conventions
- `database/sql`
- `github.com/XSAM/otelsql`
- `github.com/jackc/pgx/v5`
- `github.com/exaring/otelpgx`
- GORM
- `gorm.io/plugin/opentelemetry/tracing`
- PostgreSQL

## Sources Consulted
- OpenTelemetry Go metric API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/
- OpenTelemetry PostgreSQL semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/postgresql/
- XSAM otelsql package documentation: https://pkg.go.dev/github.com/XSAM/otelsql
- XSAM otelsql README: https://github.com/XSAM/otelsql
- pgx v5 package documentation: https://pkg.go.dev/github.com/jackc/pgx/v5
- exaring otelpgx package documentation: https://pkg.go.dev/github.com/exaring/otelpgx
- exaring otelpgx README: https://github.com/exaring/otelpgx
- GORM OpenTelemetry plugin documentation: https://pkg.go.dev/gorm.io/plugin/opentelemetry/tracing
- GORM OpenTelemetry plugin README: https://github.com/go-gorm/opentelemetry

## Issues Found
- The original `database/sql` instrumentation import path, `go.opentelemetry.io/contrib/instrumentation/database/sql/otelsql`, is not a current documented package. Updated the install command and import to `github.com/XSAM/otelsql`.
- The original pgx instrumentation import path, `go.opentelemetry.io/contrib/instrumentation/github.com/jackc/pgx/v5/otelpgx`, is not a current documented package. Updated the install command and import to `github.com/exaring/otelpgx`.
- The original GORM instrumentation import path, `go.opentelemetry.io/contrib/instrumentation/gorm.io/gorm/otelgorm`, is not a current documented package. Updated the install command and code to use `gorm.io/plugin/opentelemetry/tracing`.
- Replaced `otelsql.RecordStats(db)` with `otelsql.RegisterDBStatsMetrics(db)`, which matches the documented XSAM otelsql API for `sql.DBStats` metrics.
- Added `otelpgx.RecordStats(pool)` after creating the pgx pool to match the documented otelpgx metrics setup.
- Updated OpenTelemetry semantic convention imports from `v1.17.0` to `v1.37.0` and replaced `semconv.DBSystemPostgreSQL` with `semconv.DBSystemNamePostgreSQL`.
- Removed unused imports and added missing imports in Go snippets, including `time` where connection pool lifetime settings are used.
- Narrowed over-specific tracing claims about query text, affected rows, result scanning, associations, and transaction boundaries to match the documented behavior of the instrumentation packages.
- Updated example database span attributes from older names (`db.operation`, `db.table`) to current semantic convention names (`db.operation.name`, `db.collection.name`).
- Added a missing `rows.Err()` check in the custom business-logic span example.

## Review Notes
The code snippets are still illustrative and omit full application setup such as creating a real database schema, starting a metric reader/exporter, and shutting down the tracer provider. Those omissions are acceptable for the scope of the tutorial.
