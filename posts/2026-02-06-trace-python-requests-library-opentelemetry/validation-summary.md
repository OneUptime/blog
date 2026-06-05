# Validation Summary: How to Trace Python Requests Library Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- requests
- requests.Session
- OpenTelemetry Python API and SDK
- OpenTelemetry requests instrumentation
- OTLP trace exporter
- urllib3 Retry / requests HTTPAdapter
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry requests instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/requests.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- urllib3 Retry API documentation: https://urllib3.readthedocs.io/en/1.26.4/reference/urllib3.util.html
- Requests advanced usage documentation: https://requests.readthedocs.io/en/stable/user/advanced/

## Issues Found
- The filtering example passed a Python predicate function to `RequestsInstrumentor().instrument(excluded_urls=...)`. The requests instrumentation expects a comma-delimited string of regex patterns, so the example was changed to build and pass an `excluded_urls` regex string.
- The session example set `self.session.timeout = 10`, but Requests does not apply a session-level `timeout` attribute to requests. The example now stores `self.timeout` on the client and passes `timeout=self.timeout` to each session request.
- The retries section claimed all urllib3 adapter retries are automatically traced as separate spans. The OpenTelemetry requests instrumentation wraps `requests.Session.send`, so adapter-level retries happen inside that request span. The text now clarifies that custom attempt spans are needed for per-attempt visibility.
- The retry example imported `Retry` through `requests.packages.urllib3`. This still works in many environments, but the authoritative API is `urllib3.util.retry.Retry`; the import was updated.
- The retry backoff comment listed exact waits as `1, 2, 4` seconds. urllib3 applies its documented exponential backoff formula after retries, so the comment was made less exact and more accurate.
- The retry example only closed the session after the loop, which would be skipped on `return` or `raise`. The session is now closed in a `finally` block.
- The complete example described two sequential API calls as demonstrating parallel/concurrent tracing. The wording now says it demonstrates multiple outbound request spans.
- The sequence diagram implied the instrumentation exports spans directly to the collector. It now refers to the SDK exporter, which is the component responsible for export.
- The context propagation snippet described automatic propagation but did not enable requests instrumentation in the snippet. It now calls `RequestsInstrumentor().instrument()` before making requests.

## Review Notes
All Python code fences were syntax-checked with `ast.parse`. An isolated `pip --target` import/API check confirmed the OpenTelemetry, requests, OTLP exporter, and urllib3 APIs used by the edited examples are importable and accept the shown arguments. The examples still use placeholder API keys, tokens, and example endpoints, so they are demonstrative rather than directly runnable end-to-end without real credentials and services.
