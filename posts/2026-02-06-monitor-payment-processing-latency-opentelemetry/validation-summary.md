# Validation Summary: How to Monitor Payment Processing Latency and Errors with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry context propagation
- OpenTelemetry semantic conventions
- OpenTelemetry Collector
- Tail sampling processor
- Attributes processor
- aiohttp
- Prometheus alert rules and histogram queries

## Sources Consulted
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python propagation API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry peer attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/peer/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- aiohttp client reference: https://docs.aiohttp.org/en/stable/client_reference.html

## Issues Found
- The metrics setup comment claimed explicit histogram bucket boundaries were being used, but the code only creates a histogram instrument. Updated the comment to say explicit boundaries should be configured in SDK views when needed.
- The in-flight metric was described as a gauge even though the code correctly uses an OpenTelemetry UpDownCounter. Updated the comment and explanatory text to use UpDownCounter.
- The gateway snippet imported `inject` from `opentelemetry.propagators`, but the global propagation helper is exposed from `opentelemetry.propagate`. Updated the import.
- The gateway snippet imported unused `context`. Removed it.
- The retry snippet used `asyncio.sleep()` without importing `asyncio`. Added the missing import.
- The gateway timeout handler caught only `aiohttp.ServerTimeoutError`, but aiohttp documents that total timeouts should be caught with `asyncio.TimeoutError`. Added `asyncio` and changed the handler accordingly.
- The HTTP span attributes used older semantic convention names (`http.method`, `http.url`, `http.status_code`). Updated them to `http.request.method`, `url.full`, and `http.response.status_code`.
- The snippets used deprecated `peer.service`. Updated it to `service.peer.name`.
- The Prometheus latency alert used `payment_gateway_latency_bucket`, but OpenTelemetry Prometheus translation appends a unit suffix for the `ms` unit by default. Updated the query to use `payment_gateway_latency_milliseconds_bucket` and aggregate buckets with `sum by (le)` for a single p95.

## Review Notes
The Python examples are illustrative and still depend on application-specific symbols such as `PaymentValidationError`, `fraud_service`, `_build_charge_request`, and `GatewayResult`. That is acceptable for the post, but a future runnable sample would need those definitions and SDK/exporter setup.
