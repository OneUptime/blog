# Validation Summary: How to Replace Datadog APM Libraries with OpenTelemetry SDKs in Python

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Python
- OpenTelemetry API, SDK, OTLP exporters, and zero-code instrumentation
- Datadog ddtrace
- Datadog DogStatsD and API clients
- Flask
- Django
- FastAPI
- Docker

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- Datadog ddtrace basic usage documentation: https://ddtrace.readthedocs.io/en/v2.12.4/basic_usage.html
- Datadog DogStatsD documentation: https://docs.datadoghq.com/extend/dogstatsd/
- Datadog Python client documentation: https://datadoghq.dev/datadogpy/
- Datadog Metrics API documentation: https://docs.datadoghq.com/api/latest/metrics/
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The package-removal comments described `datadog` as the Datadog API client and `datadog-api-client` as a separate DogStatsD client. The Datadog Python `datadog` package provides the `statsd`/DogStatsD client, while `datadog-api-client` is the generated REST API client. Updated the comments to identify each package correctly.
- The OpenTelemetry observable gauge callback used `options.observe(...)`. Current OpenTelemetry Python callbacks receive `CallbackOptions` and return or yield `Observation` objects. Updated the example to import `CallbackOptions` and `Observation`, then yield an `Observation`.

## Review Notes
The main OpenTelemetry setup, CLI commands, OTLP exporter constructor usage, trace status handling, span attribute usage, and Flask/Django/FastAPI instrumentation examples were consistent with the current official documentation and installed package signatures checked during review.
