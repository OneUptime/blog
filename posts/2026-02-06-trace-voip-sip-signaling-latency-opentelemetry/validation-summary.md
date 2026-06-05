# Validation Summary: How to Trace VoIP Call Setup and Teardown Latency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python context propagation
- OpenTelemetry metrics API
- SIP signaling
- W3C Trace Context
- VoIP call setup and teardown flows

## Sources Consulted
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python propagate API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/propagate.html
- OpenTelemetry Python text map propagators documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/propagators.textmap.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python propagation guide: https://opentelemetry.io/docs/languages/python/propagation/
- SIP RFC 3261: https://www.rfc-editor.org/rfc/rfc3261
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- RFC 6648, Deprecating the "X-" Prefix and Similar Constructs in Application Protocols: https://www.rfc-editor.org/info/rfc6648

## Issues Found
- The root span was named `sip.call.setup` but was ended only after BYE completion, which would make the span duration represent the full call rather than setup latency. Changed it to `sip.call` while keeping setup latency as a span attribute/event.
- The SIP propagation example subclassed `dict` but did not provide the explicit OpenTelemetry getter/setter objects expected for non-dictionary carriers. Replaced it with `SIPHeaderGetter` and `SIPHeaderSetter` implementations and passed them to `propagate.extract()` and `propagate.inject()`.
- The propagation example used `X-OTel-*` headers. Updated the example to use `OTel-*` private SIP extension headers to avoid the deprecated `X-` prefix convention.
- The concurrent active calls metric was described and named as a gauge while using an UpDownCounter. Updated the comment and variable name to match the OpenTelemetry instrument type.

## Review Notes
The code examples are still illustrative middleware examples and assume the surrounding SIP message object provides `get_header`, `add_header`, `headers`, `method`, and `status_code` members. Production SIP instrumentation should also disambiguate 200 OK responses by CSeq/method and account for CANCEL, non-2xx final responses, retransmissions, forks, and dialog tags.
