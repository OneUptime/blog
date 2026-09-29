# Validation Summary: How to Stop OpenTelemetry Baggage from Leaking Customer IDs to Third-Party APIs

## Status
validated

## Post Type
Technical guide with a Python implementation example and propagator configuration guidance.

## Technologies Covered
- OpenTelemetry baggage and context propagation
- OpenTelemetry Python API and HTTP client instrumentation
- W3C Baggage and W3C Trace Context
- Python context management and asynchronous execution
- OpenTelemetry Collector telemetry redaction

## Sources Consulted
- [OpenTelemetry baggage concepts and security considerations](https://opentelemetry.io/docs/concepts/signals/baggage/)
- [OpenTelemetry Python baggage API](https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html)
- [Python baggage implementation](https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/baggage.html)
- [Python context implementation](https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/context.html)
- [Python W3C baggage propagator implementation](https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/baggage/propagation.html)
- [Python global propagation configuration implementation](https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/propagate.html)
- [OpenTelemetry Baggage API specification](https://opentelemetry.io/docs/specs/otel/baggage/api/)
- [OpenTelemetry SDK environment variable specification](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
- [OpenTelemetry Requests instrumentation implementation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/requests.html)
- [W3C Baggage specification, including security and privacy considerations](https://www.w3.org/TR/baggage/)
- [Python contextvars documentation](https://docs.python.org/3/library/contextvars.html)
- [OpenTelemetry handling sensitive data guidance](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [Author profile linked by the post](https://github.com/nawazdhandala)

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post contains meaningful implementation guidance and qualifies for technical validation.
- Parsed the Python example with Python's AST parser successfully. The imports and public APIs match the official Python documentation and source; no deprecated API is used in the example.
- Confirmed that baggage.clear returns a context with empty baggage, while context.set_value copies other context entries. Attaching that context therefore preserves the active span, and detaching the returned token restores the caller's context. The finally block covers normal returns and raised exceptions.
- Confirmed that HTTP instrumentation injects propagation headers during the client operation. The synchronous callback restriction and guidance to keep context attached throughout an awaited operation are appropriate.
- Confirmed that empty active baggage does not remove a preexisting baggage header: the Python baggage propagator returns without modifying the carrier. The post explicitly warns about manual headers and cached client defaults.
- Verified OTEL_PROPAGATORS=tracecontext against the specification and Python loader. It selects trace propagation without baggage for users of the configured global propagator. Programmatic replacement or independently configured propagators can behave differently, consistent with the bootstrap caveat in the post.
- Verified the distinction between outgoing baggage and exported span attributes. Collector redaction acts on telemetry and cannot remove headers already sent to an external endpoint.
- The trust-boundary policy, bounded internal allowlist, rejection of baggage as authorization evidence, and warning about hashing identifiers are consistent with the consulted security guidance.
- Retry, redirect, concurrent-request, and receiver-side checks are appropriate validation recommendations. The helper does not implement destination selection or redirect interception; those remain responsibilities of the surrounding outbound policy, as described in the post.
- All linked documentation resources resolved to the relevant pages. The author URL redirects to the expected GitHub profile. No explicit library version is claimed in the post.
- Runtime HTTP integration tests were not executed because OpenTelemetry is not installed in the local Python environment. Validation consists of syntax checking and review against official documentation and implementation source; no claim is made that a particular application's redirect or retry behavior was tested.
