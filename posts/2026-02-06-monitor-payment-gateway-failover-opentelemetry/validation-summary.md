# Validation Summary: How to Monitor Payment Gateway Failover with OpenTelemetry Distributed Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- asyncio
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry Collector
- OpenTelemetry Collector probabilistic sampler processor
- OpenTelemetry Collector attributes processor
- Payment gateway failover monitoring

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector probabilistic sampler processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The gateway-call snippet used `asyncio.wait_for` and caught `asyncio.TimeoutError`, but the import block did not import `asyncio`. Added `import asyncio` so the combined Python example is syntactically complete for the shown API usage.
- The Collector configuration comment claimed payment traces were sampled at 100% while other traces were sampled at 10%, but the configured `probabilistic_sampler.sampling_percentage` was `10`, which samples 10% of received traces. Changed the comment and value to sample payment traces at 100%, matching the surrounding text and the probabilistic sampler processor documentation.

## Review Notes
The example uses placeholder gateway clients and exception types (`StripeClient`, `BraintreeClient`, `AdyenClient`, `GatewayTimeoutError`, `GatewayDeclinedError`, and `GatewayError`) as application abstractions, so those would need to be supplied by a real payment service. The OpenTelemetry tracing calls, metric instrument usage, attributes processor delete action, and OTLP exporter endpoint format are consistent with current official documentation.
