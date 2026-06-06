# Validation Summary: How to Debug Broken Context Propagation in Distributed Systems

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API and instrumentation
- W3C Trace Context
- B3 propagation
- Flask
- Python requests
- curl
- Nginx reverse proxying
- OpenTelemetry Collector

## Sources Consulted
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python `opentelemetry.propagate` API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python requests instrumentation documentation: https://opentelemetry-python-kinvolk.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- NGINX reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy

## Issues Found
- The post referred to `W3CTraceContextTextMapPropagator`, which is not the current Python class name. Changed it to `TraceContextTextMapPropagator`.
- The composite propagator example imported `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation`, but the documented Python import path is `opentelemetry.trace.propagation.tracecontext`. Updated the import.
- The propagator diagnostic comment implied that `NoOpTextMapPropagator` is the expected disabled state. Updated the note to reflect current `OTEL_PROPAGATORS=none` behavior and the documented default composite propagator.
- The proxy troubleshooting `curl -v | grep traceparent` commands implied that seeing the header in curl output proves the server received it. Updated the comments and commands to make clear that the receiving service logs or a debug endpoint must confirm arrival.
- The Nginx note incorrectly suggested that custom request headers are generally not forwarded by default. Updated it to match NGINX documentation: proxied request headers are forwarded by default except rewritten headers such as `Host` and `Connection` and headers with empty values; problematic configurations usually involve directives such as `proxy_pass_request_headers off` or `proxy_set_header`.
- Two snippets indexed into `traceparent.split("-")[1]` without checking the header format. Added minimal guards so malformed traceparent values do not raise `IndexError`.

## Review Notes
The OpenTelemetry Collector debug exporter configuration with `verbosity: detailed`, the `OTEL_PROPAGATORS=tracecontext,b3multi` example, and the Flask and requests instrumentation guidance are consistent with current OpenTelemetry documentation. The post remains version-general, so future reviews should re-check Python package import paths and Collector component names as OpenTelemetry releases evolve.
