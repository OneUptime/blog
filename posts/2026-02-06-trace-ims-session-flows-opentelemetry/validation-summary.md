# Validation Summary: How to Trace IMS (IP Multimedia Subsystem) Session Flows with OpenTelemetry

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTelemetry distributed tracing
- OpenTelemetry Python API
- W3C Trace Context
- SIP signaling
- IMS, VoLTE, and VoNR
- P-CSCF, I-CSCF, S-CSCF, HSS, MGCF/MGW, and IMS Application Servers

## Sources Consulted
- OpenTelemetry Python propagators API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.textmap.html
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- RFC 5727, SIP Change Process: https://datatracker.ietf.org/doc/html/rfc5727
- ETSI/3GPP TS 23.228 IMS Stage 2 specification: https://www.etsi.org/deliver/etsi_ts/123200_123299/123228/18.10.00_60/ts_123228v181000p.pdf
- RFC 3325, SIP Asserted Identity: https://www.rfc-editor.org/rfc/rfc3325.html

## Issues Found
- The custom propagator imported `context` from OpenTelemetry and also used `context` as a method parameter. In `extract`, the fallback expression `context or context.get_current()` would raise an error when no context argument was supplied. Updated the import to `context as otel_context`, created a `current_context` variable, and used that consistently.
- The propagator accepted optional `getter` and `setter` arguments but manually accessed the carrier when those were omitted. Updated it to use OpenTelemetry Python's documented `default_getter` and `default_setter` defaults, matching the `TextMapPropagator` API.
- The post recommended new custom SIP headers with a `P-` prefix (`P-OTel-Traceparent` and `P-OTel-Tracestate`). RFC 5727 deprecates minting new `P-` SIP headers, so the example now uses `OTel-Traceparent`.
- The propagator advertised a tracestate field but did not inject or extract it. Removed the unused tracestate header constant from the example and from `fields`.
- The traceparent parser accepted all-zero trace IDs and span IDs, which W3C Trace Context defines as invalid. Added validation to ignore those invalid values and keep the existing context.

## Review Notes
The IMS architecture and flow descriptions are broadly accurate for a high-level tracing tutorial. The helper functions in the P-CSCF and S-CSCF snippets, such as `forward_to_icscf`, `query_hss`, and `inject_trace_context`, are application-specific placeholders rather than complete runnable code.
