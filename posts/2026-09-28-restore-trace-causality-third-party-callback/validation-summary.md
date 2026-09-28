# Validation Summary: How to Restore Trace Continuity After a Third-Party Callback That Does Not Return `traceparent`

## Status
validated

## Post Type
Technical implementation guide with Python examples.

## Technologies Covered
- OpenTelemetry Python API and SDK
- W3C Trace Context (`traceparent` and `tracestate`)
- Distributed tracing, context propagation, and span links
- HTTP webhooks, signature verification, replay protection, and tenant scoping
- Durable correlation records, idempotent event processing, and reconciliation

## Sources Consulted
- W3C Trace Context: https://www.w3.org/TR/trace-context/ — header formats, identifier validation, propagation, and security considerations.
- OpenTelemetry Python propagation guide: https://opentelemetry.io/docs/languages/python/propagation/ — carrier injection and extraction.
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html — `get_tracer`, `get_current_span`, `Link`, and `start_as_current_span` signatures and behavior.
- Official Python trace-context propagator implementation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python/main/opentelemetry-api/src/opentelemetry/trace/propagation/tracecontext.py — trace-only injection and invalid-header extraction behavior.
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/ — parent selection at creation, root spans, and links across traces.
- Stripe webhook documentation: https://docs.stripe.com/webhooks — an authoritative provider example covering raw-body signature verification, replay checks, retries, asynchronous handling, and duplicate deliveries. Provider-specific requirements must still be checked for the actual integration.
- Author profile: https://github.com/nawazdhandala — the post's author URL redirects to this profile successfully.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. Both Python examples are syntactically valid and use documented, non-deprecated APIs. There are no terminal commands, configuration snippets, or explicit library-version claims in the post.
- Executed the exact Python code blocks in an isolated environment with Python 3.9.6 and OpenTelemetry SDK/API 1.41.1, using an in-memory span exporter.
- Confirmed that capture preserves the active origin context without injecting baggage. Capture without an active valid span returns an empty dictionary.
- Confirmed that normal processing retains the callback server span as parent, shares its trace ID, links to the saved origin span in a separate trace, and returns the handler result.
- Confirmed that empty carriers, malformed traceparent strings, and zero trace IDs produce no origin link and set app.callback.origin_found to false without substituting the active callback span. The carrier is expected to retain the dictionary-of-header-values structure described in the post; arbitrary storage corruption or non-string values require application-level validation.
- Confirmed that processing without an active span creates a root span while retaining the origin link. Links express causality without merging traces or recovering unobserved provider spans.
- Authentication, database claims, duplicate suppression, tenant checks, and early-callback reconciliation are application responsibilities explicitly outside the instrumentation helper. Reviewed their design guidance; no provider integration or database implementation is included, so those end-to-end scenarios were not executed.
- Successful telemetry inspection requires suitable SDK sampling, export, and backend retention settings. A valid linked context does not guarantee that the historical span was sampled or remains searchable. The app.* attributes are application-defined attributes.
- The referenced technical documentation URLs resolve to the intended resources. The review found no deprecated APIs requiring replacement.
