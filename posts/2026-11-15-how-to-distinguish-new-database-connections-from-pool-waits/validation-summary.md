# Validation Summary: How to Distinguish New Database Connections from Pool Waits

## Status

Validated through documentation review and the checks below. Deployment verification remains environment-specific.

## Post Type

Practical tutorial.

## Technologies Covered

.NET, PostgreSQL, OpenTelemetry

## Sources Consulted

- https://www.npgsql.org/doc/diagnostics/metrics.html
- https://www.npgsql.org/doc/diagnostics/tracing.html
- https://www.npgsql.org/doc/connection-string-parameters.html
- https://www.postgresql.org/docs/17/monitoring-stats.html

## Issues Found

No outstanding issues identified in the performed checks. Live service behavior was not tested.

## Review Notes

- Reviewed official documentation and example semantics; checked metadata, title uniqueness, and fenced-block structure.
- JSON examples parsed and shell examples syntax-checked where present. No production services contacted by examples.
- C# fragments and tracing APIs reviewed for Npgsql 10; PostgreSQL query reviewed against version 17 activity fields. No C# compilation or database experiment was run.
