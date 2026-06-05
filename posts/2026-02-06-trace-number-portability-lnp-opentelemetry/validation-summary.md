# Validation Summary: How to Trace Number Portability (LNP) Request Processing with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Local Number Portability (LNP)
- Number Portability Administration Center/Service Management System (NPAC/SMS)
- Local Service Request (LSR) and Firm Order Confirmation (FOC) workflows
- Telecommunications routing updates with Location Routing Numbers (LRNs)

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- NPAC Porting and Access documentation: https://numberportability.com/about/porting-and-access
- NPAC General FAQ: https://www.numberportability.com/support/faq/general
- FCC Porting Interval Order, FCC 09-41: https://docs.fcc.gov/public/attachments/FCC-09-41A1.pdf

## Issues Found
- The original code emitted raw telephone numbers in span attributes as `lnp.ported_number`. Telephone numbers are sensitive personal data in this context, and OpenTelemetry's sensitive data guidance warns that telemetry can capture PII. Changed the code to emit `lnp.ported_number_hash` using SHA-256 instead of the raw telephone number.
- The original code could pass `None` values to OpenTelemetry span attributes with `foc_data.get("due_date")` and `foc_data.get("reason")`. OpenTelemetry Python documents `None` attribute values as undefined and strongly discouraged. Changed the code to set those attributes only when values are present.
- The original code could pass timestamp-like objects directly as span attributes for LSR and activation timestamps. OpenTelemetry attribute values are limited to primitive scalar values or homogeneous primitive sequences. Added a small formatter to convert timestamp-like values to ISO strings before setting them as attributes.
- The original code declared `lnp.port_request.duration` and the dashboard recommended tracking completed status and end-to-end duration, but the `complete()` method never recorded the duration or a completed status count. Updated `complete()` to record elapsed hours and increment `status=completed`.
- The original code used `self.root_span.start_time` and an undefined `calculate_hours_elapsed()` helper for FOC response time. Replaced this with an explicit `self.started_at` timestamp and a direct elapsed-hours calculation so the example is self-contained.
- The dashboard recommended tracking `validated` status, but successful validation did not increment that counter. Added `status=validated` after successful validation.

## Review Notes
The Python snippet was extracted from the README and passed a syntax-only `python3 -m py_compile` check. Domain-specific functions such as `query_npac`, `send_lsr_to_donor`, `activate_in_npac`, and `update_lrn_routing` remain illustrative placeholders, which is acceptable for this tutorial-style post.
