# Validation Summary: How to Instrument A/B Testing of Checkout Flows with OpenTelemetry Baggage

## Status
validated

## Post Type
Tutorial / instrumentation guide

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry Baggage
- OpenTelemetry context propagation
- W3C Baggage HTTP header
- Python requests
- OpenTelemetry metrics and traces
- A/B testing telemetry for checkout flows

## Sources Consulted
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/baggage.html
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation guide: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- W3C Baggage specification: https://www.w3.org/TR/baggage/

## Issues Found
- The HTTP propagation example imported `requests` but did not show how baggage or trace context headers were actually injected into outbound calls. I added a `_call_service` helper that uses `opentelemetry.propagate.inject(headers)` before calling `requests.post`, matching the configured OpenTelemetry propagators.
- The first snippet imported unused `context` and `W3CBaggagePropagator` symbols. I removed those imports because the snippet uses `baggage.set_baggage` directly and the HTTP section now uses the global propagator.
- The payment service snippet used `time.time()` and `tracer` without defining/importing them in the snippet. I added `import time`, imported `trace`, and created a payment-service tracer.
- The conversion query counted successes with `status = 'OK'`, but OpenTelemetry spans are normally left with unset status on success unless code explicitly marks them OK. I changed the example to count spans where `status != 'ERROR'`.

## Review Notes
The baggage usage is technically correct for small experiment identifiers. The post correctly warns against placing large payloads or user-profile data in baggage; this aligns with W3C guidance that baggage can propagate to other systems and should not carry private information that should not leave a trust boundary.
