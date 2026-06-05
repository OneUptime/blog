# Validation Summary: How to Build a Custom OpenTelemetry Instrumentation Library

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API, SDK, and instrumentation packages
- OpenTelemetry semantic conventions
- Python packaging entry points
- Python HTTP framework instrumentation

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python zero-code instrumentation docs: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python instrumentation library docs: https://opentelemetry.io/docs/languages/python/libraries/
- OpenTelemetry Python `BaseInstrumentor` docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/base/instrumentor.html
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry instrumentation scope docs: https://opentelemetry.io/docs/concepts/instrumentation-scope/

## Issues Found
- The monkey patch assigned a bound instrumentor method directly to `InternalHTTPServer.handle_request`, which would not receive the server instance as intended. I changed the example to use `wrapt.wrap_function_wrapper`, matching the wrapper style used by OpenTelemetry Python instrumentation packages, and unwrapped it with `unwrap`.
- The wrapper referenced `response` in `finally`, but `response` could be undefined when the wrapped handler raised an exception. I initialized `status_code` before the call and used that for metrics.
- The examples used older HTTP semantic attributes such as `http.method` and `http.status_code`. I updated them to the stable names `http.request.method` and `http.response.status_code`, and used current generated semantic convention constants.
- The HTTP server duration histogram used milliseconds, but the stable `http.server.request.duration` metric uses seconds. I changed the unit to `s` and recorded seconds.
- The sample counter used the reserved semantic metric name `http.server.request.count`, which is not a current stable HTTP metric. I renamed it to the custom `internalhttp.server.request.count`.
- The server span marked all 4xx responses as errors. Current HTTP server span guidance leaves 4xx server span status unset by default and sets error status for 5xx. I changed the status handling accordingly.
- The sample app called `trace.set_tracer_provider(provider)` without importing `trace`. I added the missing import.
- The test snippet omitted imports for `InternalHTTPServer`, `InternalHTTPInstrumentor`, and `SimpleSpanProcessor`, and used an outdated `InMemorySpanExporter` import path. I added the missing imports and changed the exporter import to `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- The simplified test uses a local fake `internalhttp` module, so `BaseInstrumentor` cannot find installed package metadata for the declared dependency. I added `skip_dep_check=True` to that test setup.

## Review Notes
The post is technically relevant and remains a valid tutorial after correction. The simplified framework uses the request path as the route because its route table stores exact paths; a production framework with parameterized routes should record the low-cardinality route template instead of the raw URL path.
