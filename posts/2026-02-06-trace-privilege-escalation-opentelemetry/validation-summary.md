# Validation Summary: How to Trace Privilege Escalation Attempts Across Microservices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API
- OpenTelemetry baggage and context propagation
- OpenTelemetry metrics
- Python middleware patterns for microservice authorization
- Microservices privilege escalation detection

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry baggage concept documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html

## Issues Found
- The original cross-service detection example treated OpenTelemetry baggage as the effective authorization source. OpenTelemetry baggage is propagated in request headers and has no built-in integrity checks, so using it directly for authorization enforcement would be insecure. I changed the detector to accept a validated authorization context for enforcement and use baggage only as a telemetry correlation hint.
- The propagation helper accepted `permissions` but did not store or return them. I added `authz.permissions` baggage handling so the example matches its function signature.
- The propagation helper called `context.attach(ctx)` without returning the token. The OpenTelemetry Python context API returns a token that can be used to restore the previous context, so I changed the helper to return that token.
- The `get_authz_context` example returned `[""]` for missing roles because it split an empty string. I changed it to return an empty list when baggage is absent.
- The first code example imported `StatusCode` but never used it. I removed the unused import.

## Review Notes
The OpenTelemetry span, event, baggage, and metric counter APIs used in the examples match current OpenTelemetry Python documentation. In a production implementation, consider hashing or redacting user identifiers before exporting telemetry and detaching the returned context token after request processing completes.
