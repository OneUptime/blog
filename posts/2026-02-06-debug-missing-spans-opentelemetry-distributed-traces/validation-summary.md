# Validation Summary: How to Debug Missing Spans in OpenTelemetry Distributed Traces

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- OpenTelemetry distributed tracing
- W3C Trace Context propagation
- Zipkin B3 propagation
- OpenTelemetry Python API and SDK
- OpenTelemetry Java API
- OpenTelemetry Collector
- Python auto-instrumentation
- Flask, requests, and ThreadPoolExecutor examples

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python sampling API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Python trace SDK documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Java TextMapPropagator Javadocs: https://javadoc.io/doc/io.opentelemetry/opentelemetry-context/latest/io/opentelemetry/context/propagation/TextMapPropagator.html

## Issues Found
- The Python multiple-propagator example imported `TraceContextTextMapPropagator` from `opentelemetry.propagators.textmap`, which is not the documented current import path and fails with current OpenTelemetry Python packages. Changed it to `opentelemetry.trace.propagation.tracecontext`.
- The first Python propagation example said `inject()` adds both `traceparent` and `tracestate`, and showed an empty `tracestate` header. Current W3C propagation examples do not require an empty `tracestate`; it is only emitted when trace state exists. Updated the comment and expected output.
- The instrumentation listing example used `pkg_resources`, which is deprecated by setuptools. Replaced it with `importlib.metadata.distributions()`.
- The `opentelemetry-instrument` comment said it would detect and instrument everything. Official Python zero-code docs describe `opentelemetry-bootstrap -a install` as the detection/install step and `opentelemetry-instrument` as running with installed auto-instrumentation. Tightened the wording.
- The flush example called `trace.set_tracer_provider(provider)` without importing `trace`. Added `from opentelemetry import trace`.

## Review Notes
- The Collector fan-out configuration shape is valid: exporters are declared under `exporters` and enabled by adding them to the traces pipeline.
- The `ParentBasedTraceIdRatio` and `OTEL_TRACES_SAMPLER=parentbased_traceidratio` examples match the Python SDK and OpenTelemetry environment variable specification.
- The manual span attribute names in the custom client example are illustrative. For production instrumentation, prefer current OpenTelemetry semantic convention attributes where applicable.
