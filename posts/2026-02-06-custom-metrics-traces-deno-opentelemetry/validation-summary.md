# Validation Summary: How to Create Custom Metrics and Traces in Deno Using OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Deno
- OpenTelemetry JavaScript API
- OpenTelemetry traces and spans
- OpenTelemetry metrics
- TypeScript
- HTTP instrumentation
- Database span semantic conventions

## Sources Consulted
- Deno OpenTelemetry runtime documentation: https://docs.deno.com/runtime/fundamentals/open_telemetry/
- Deno.telemetry API reference: https://docs.deno.com/api/deno/~/Deno.telemetry
- Deno npm imports documentation: https://docs.deno.com/examples/npm/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The post used manual Node SDK setup with `NodeTracerProvider`, `MeterProvider`, OTLP exporters, and `Resource`. Deno's official OpenTelemetry documentation says Deno automatically registers OpenTelemetry providers when `OTEL_DENO=true`, so I changed the setup to import `npm:@opentelemetry/api@1` and access Deno's built-in telemetry providers.
- The dependency examples pinned older OpenTelemetry SDK packages and deprecated semantic convention constants. I removed those SDK dependencies and kept only the current OpenTelemetry API import required for Deno custom instrumentation.
- The database span attributes used older names such as `db.system`, `db.statement`, `db.operation`, and `db.row_count`. I updated them to current semantic convention names including `db.system.name`, `db.query.text`, `db.operation.name`, and `db.response.returned_rows`.
- The HTTP examples used older semantic attribute names such as `http.method`, `http.status_code`, `http.url`, and `http.user_agent`. I updated them to current names including `http.request.method`, `http.response.status_code`, `url.path`, and `user_agent.original`.
- The metrics example imported a type re-export as a runtime import. I changed it to `import { type MeterProvider }` so the TypeScript example is consistent with the dependency module.

## Review Notes
- I could not run `deno check` locally because the `deno` CLI is not installed in the workspace.
- The corrected Deno OpenTelemetry setup assumes Deno 2.4 or newer, where the OpenTelemetry integration is stable. Older Deno versions may require `--unstable-otel`.
- The database example records `db.query.text`; production code should sanitize query text or use parameterized statements to avoid leaking sensitive data.
