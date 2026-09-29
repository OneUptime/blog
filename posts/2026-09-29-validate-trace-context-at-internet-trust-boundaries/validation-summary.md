# Validation Summary: How to Validate Untrusted `traceparent` and Trim `tracestate` at Public Ingress

## Status
validated

## Post Type
Technical guide with a Python implementation example.

## Technologies Covered
- W3C Trace Context: `traceparent` and `tracestate`
- OpenTelemetry Python API and SDK
- Python context extraction and propagation
- HTTP ingress, trust boundaries, and parent-based sampling

## Sources Consulted
- W3C Trace Context, including header formats, processing, mutation, privacy, and security rules: https://www.w3.org/TR/trace-context/
- W3C traceparent mutation rules: https://www.w3.org/TR/trace-context/#mutating-the-traceparent-field
- OpenTelemetry Python v1.41.1 propagator implementation: https://github.com/open-telemetry/opentelemetry-python/blob/v1.41.1/opentelemetry-api/src/opentelemetry/trace/propagation/tracecontext.py
- Raw version-pinned propagator source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-python/v1.41.1/opentelemetry-api/src/opentelemetry/trace/propagation/tracecontext.py
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python text-map propagation API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.textmap.html
- OpenTelemetry sampling specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python sampling API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html

## Issues Found
- The prose described a “four-entry vendor allowlist,” but `ALLOWED_VENDORS` contains only `approvedvendor`; `[:4]` instead limits the number of retained entries. Changed the sentence to distinguish the vendor allowlist from the four-entry retention cap. Both are local policies. The code required no changes.

## Review Notes
- Checked the Python syntax with `compile` and reviewed the imports, constructor arguments, extraction, and context APIs against official documentation and the pinned implementation. No deprecated API usage was identified.
- Confirmed invalid parent handling, independent state validation, ordered member filtering, remote context construction, and explicit empty-context isolation. This propagator reads only the two trace-context headers; it does not extract baggage.
- Confirmed the restriction on changing state when forwarding an unchanged parent header, and the need to apply ingress policy before the server span is created.
- Confirmed that the default ParentBased remote sampled branch uses AlwaysOn, while its remote unsampled branch uses AlwaysOff. Sampling remains a separate policy decision and does not authenticate the caller or prove storage upstream.
- Higher versions are not automatically invalid: forward-compatible parsing can accept their known fields. The forbidden `ff` version must be rejected. Rollout fixtures should distinguish these cases.
- Header normalization, duplicate-parent rejection, and byte limits are adapter responsibilities, as the post states. A plain dictionary used with the default getter needs normalized lowercase header names. Repeated state fields must preserve their order.
- The version-pinned source link resolves and matches the example. The referenced technical documentation links resolve to the intended resources. No terminal commands or configuration snippets needed review.
- Runtime integration checks were attempted in an isolated temporary environment, but dependency installation did not complete during the review. Validation is based on official sources and the successful syntax check; no runtime or framework integration test pass is claimed.
