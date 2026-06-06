# Validation Summary: How to Trace Anti-Money Laundering Screening Pipeline Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Python manual instrumentation
- Anti-money laundering screening pipeline observability

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry metrics concepts documentation: https://opentelemetry.io/docs/concepts/signals/metrics/

## Issues Found
- The setup snippet imported `TracerProvider` and `MeterProvider` but did not configure them as global providers or attach exporters. I updated the snippet to create a `TracerProvider` with a `BatchSpanProcessor` and `ConsoleSpanExporter`, and a `MeterProvider` with a `PeriodicExportingMetricReader` and `ConsoleMetricExporter`, then install both globally before acquiring the tracer and meter.
- The watchlist snippet recorded total duration using an undefined `sum_stage_durations()` helper. I replaced it with a local `time.monotonic()` measurement around the watchlist screening work.
- Several snippets referenced `time`, `tracer`, `stage_duration`, and metric instruments without importing them from the setup module. I added the missing imports so the snippets are syntactically complete and consistent with the setup example.

## Review Notes
The examples use custom AML attribute names rather than OpenTelemetry semantic convention attributes because AML-specific semantic conventions are not standardized. The post correctly avoids putting party names directly into spans, but production systems should still review hashed identifiers and alert identifiers for privacy, retention, and cardinality risk before exporting telemetry.
