# Validation Summary: How to Instrument CloudEvents with OpenTelemetry Using the CloudEvents SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CloudEvents
- CloudEvents Python SDK
- OpenTelemetry Python API and SDK
- W3C Trace Context
- HTTP CloudEvents binding
- OTLP trace export

## Sources Consulted
- CloudEvents Python SDK README: https://github.com/cloudevents/sdk-python
- CloudEvents Distributed Tracing extension: https://github.com/cloudevents/spec/blob/main/cloudevents/extensions/distributed-tracing.md
- CloudEvents JSON event format: https://github.com/cloudevents/spec/blob/main/cloudevents/formats/json-format.md
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry CloudEvents semantic conventions: https://opentelemetry.io/docs/specs/semconv/cloudevents/cloudevents-spans/
- Current Python package behavior checked locally with `cloudevents==2.1.0` and `opentelemetry-api==1.42.1`

## Issues Found
- The post said the CloudEvents SDK ships with a distributed tracing extension. The extension is defined by the CloudEvents specification; the Python SDK carries those extension attributes as CloudEvent attributes. Updated the wording to avoid implying a dedicated SDK helper.
- The CloudEvents Python imports used removed APIs: `cloudevents.http` and `cloudevents.conversion`. Updated examples to the current `cloudevents.core.v1.event`, `cloudevents.core.formats.json`, and `cloudevents.core.bindings.http` APIs.
- The OpenTelemetry propagator import path was incorrect for current OpenTelemetry Python. Changed it to `opentelemetry.trace.propagation.tracecontext.TraceContextTextMapPropagator`.
- The consumer example used dict-style CloudEvent access and `event.data`, which do not work with the current SDK. Updated it to `get_id()`, `get_type()`, `get_source()`, `get_data()`, and `get_extension()`.
- The HTTP example described trace context in both headers and body but only injected it into headers. Updated it to add `traceparent` and optional `tracestate` to the CloudEvent before structured serialization, then also inject the W3C trace context into HTTP headers.
- The structured HTTP example said structured mode produced "JSON body with CE headers." Updated the comment because structured content mode carries CloudEvent attributes in the JSON body, with the HTTP `content-type` header indicating `application/cloudevents+json`.

## Review Notes
The examples were validated against current package imports and a JSON serialization/deserialization round trip. The OpenTelemetry CloudEvents semantic conventions are currently marked Development, so future posts may want to mention version-specific semantic-convention status if they go deeper into span naming or messaging span topology.
