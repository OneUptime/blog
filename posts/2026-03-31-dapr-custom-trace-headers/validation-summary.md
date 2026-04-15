# Validation Summary: How to Use Custom Trace Headers in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, pub/sub APIs)
- W3C Trace Context (traceparent, tracestate)
- W3C Baggage specification
- OpenTelemetry Python SDK (baggage, propagation APIs)
- Python / Flask
- CloudEvents

## Sources Consulted
- Dapr Service Invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Service Invocation overview — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Pub/Sub how-to — https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- W3C Baggage specification — https://www.w3.org/TR/baggage/
- OpenTelemetry Python SDK source (opentelemetry-api baggage and propagate modules) — https://github.com/open-telemetry/opentelemetry-python
- Dapr GitHub issue dapr/dapr#6075 (open feature request for pub/sub header propagation, confirming the feature does not exist)

## Issues Found

### 1. Incorrect claim about pub/sub custom header propagation
**What was wrong:** The note stated "For pub/sub, custom headers are included in the CloudEvent metadata, not the message body." This is false — custom HTTP headers like `x-user-id` and `x-request-id` sent with a Dapr publish request are NOT forwarded to subscribers via the CloudEvent envelope. Only trace context headers (`traceparent`, `tracestate`) and standard CloudEvent fields are propagated. There is an open Dapr feature request (dapr/dapr#6075) specifically requesting this capability, confirming it does not exist.

**What was changed:** Replaced the note with an accurate explanation: custom HTTP headers are not automatically forwarded to subscribers in pub/sub; only trace context headers are propagated via the CloudEvent envelope; custom metadata should be included in the message body.

### 2. Inaccurate characterization of W3C Baggage size limit
**What was wrong:** The post stated "W3C spec recommends under 8192 bytes" for baggage size. The W3C Baggage specification actually defines 8192 bytes as the minimum guaranteed propagation threshold — platforms MUST propagate baggage of 8192 bytes or fewer. It is a floor for interoperability, not a recommended ceiling.

**What was changed:** Updated to "W3C spec requires platforms to propagate at least 8192 bytes" to accurately reflect the specification's intent.

## Review Notes
- Code snippets are intentionally incomplete (missing `import json`, undefined `extract_trace_id()` and `current_traceparent()` functions). This is acceptable for blog post code fragments that demonstrate concepts.
- The `parse_baggage` function is a simplified parser that does not handle W3C Baggage properties (`;property=value` within a list-member). This is acceptable as a teaching example but should not be used in production.
- The `get_baggage` import in the OpenTelemetry example is unused in the code shown, but its inclusion is reasonable for demonstrating the available API surface.
- The `yaml` language tag on the baggage header code block is unconventional (it's an HTTP header, not YAML) but renders acceptably.
- All OpenTelemetry Python SDK API usage (set_baggage, extract, inject, attach, detach) was verified against the canonical source and is correct.
- All Dapr API URL formats (service invocation and pub/sub) are correct per official documentation.
