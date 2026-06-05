# Validation Summary: How to Test Context Propagation Across Service Boundaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python
- OpenTelemetry context propagation
- W3C Trace Context
- B3 propagation
- Python `requests` instrumentation
- OpenTelemetry Collector OTLP/file export format
- Docker Compose

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python `requests` instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry Python `requests` instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/requests.html
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Propagators API specification, including B3 requirements: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry Protocol File Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- Docker Compose file reference for the obsolete `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose service dependency documentation: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The W3C Trace Context diagram used placeholder trace IDs and span IDs such as `abc123`, `span-1`, and `span-2`, which are not valid `traceparent` field lengths. Updated the diagram to use a 32-character trace ID and 16-character span IDs.
- The OpenTelemetry Python in-memory exporter import path was outdated/incorrect for current packages. Changed `opentelemetry.sdk.trace.export.in_memory` to `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- The `requests` injection test claimed instrumentation would inject headers but did not enable `RequestsInstrumentor`. Added explicit instrumentation with the test `TracerProvider` and uninstrumenting in `tearDown`.
- The injection test patched `requests.Session.send`, which replaces the method OpenTelemetry wraps and prevents header injection. Changed the mock to `requests.adapters.HTTPAdapter.send` and used a real `requests.Response` object.
- The unit tests repeatedly called `trace.set_tracer_provider`, which is global one-time state and can make repeated tests unreliable. Switched to `self.provider.get_tracer(...)` and passed the provider directly to `RequestsInstrumentor`.
- The B3 example used `trace.get_current_span(...)` without importing `trace`. Added the missing import.
- The B3 example used mixed-case dictionary keys with the default OpenTelemetry Python dict getter, which did not extract context in a plain dict carrier. Changed the example keys to lowercase header names.
- The Docker Compose example included the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The Compose discussion implied `depends_on` meant services were fully up. Clarified that the test runner starts after the service containers are started, because short-form `depends_on` does not wait for application readiness.

## Review Notes
- The runnable injection, extraction, and B3 Python examples were tested with current OpenTelemetry packages installed into a temporary target directory. The end-to-end integration example was syntax-checked only because it requires local services and a Collector file exporter setup.
- For a production CI version of the Compose example, add health checks or an explicit wait strategy so the test runner waits for service readiness, not just container start order.
