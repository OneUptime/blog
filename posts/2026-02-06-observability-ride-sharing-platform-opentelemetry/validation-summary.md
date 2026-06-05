# Validation Summary: How to Set Up Observability for a Ride-Sharing Platform Using OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP gRPC exporters
- OpenTelemetry Collector
- OpenTelemetry Collector resource and tail sampling processors
- Distributed tracing and metrics for microservices

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python resources API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/entities/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector attributes/resource processor action syntax: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The post description said the guide covered logs, but the examples configure traces and metrics only. Updated the description to say "tracing and metrics" so it matches the implementation.
- The shared resource configuration used the deprecated `deployment.environment` semantic attribute. Updated it to the current stable `deployment.environment.name` attribute.
- The matching service used a variable named `nearby_drivers_gauge` for a histogram instrument. Renamed it to `nearby_drivers_count` so the code no longer implies that a synchronous gauge instrument is being used.
- The Collector example used `tail_sampling` without noting that this processor is provided by Collector distributions with contrib components. Added a short note that `otelcol-contrib` or an equivalent distribution is required.

## Review Notes
- The Python snippets are illustrative and assume application-specific objects such as `location_service`, `pricing_service`, `Match`, `eta_service`, and `notification_service` exist in the surrounding service code.
- The examples attach ride IDs, driver IDs, and precise pickup coordinates to spans. In production, those attributes should be reviewed for privacy, retention, and backend access-control requirements.
