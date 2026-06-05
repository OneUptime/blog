# Validation Summary: How to Use OpenTelemetry Semantic Conventions for CloudEvents

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- CloudEvents
- OpenTelemetry Python tracing API
- CloudEvents Python SDK
- OpenTelemetry JavaScript/TypeScript API
- CloudEvents JavaScript SDK
- Messaging semantic conventions

## Sources Consulted
- OpenTelemetry CloudEvents span semantic conventions: https://opentelemetry.io/docs/specs/semconv/cloudevents/cloudevents-spans/
- OpenTelemetry messaging semantic convention attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/semconv/
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
- CloudEvents Python SDK README: https://github.com/cloudevents/sdk-python
- CloudEvents JavaScript SDK API docs: https://cloudevents.github.io/sdk-javascript/classes/CloudEvent.html
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/

## Issues Found
- The post listed `cloudevents.event_data_content_type` and used `cloudevents.event_time` as OpenTelemetry CloudEvents semantic convention attributes. The current OpenTelemetry CloudEvents span convention defines `cloudevents.event_id`, `cloudevents.event_source`, `cloudevents.event_spec_version`, `cloudevents.event_subject`, and `cloudevents.event_type`, but not those two attributes. Removed the unsupported attributes from the table and helper examples.
- The Python CloudEvents example used `cloudevents.http` and `cloudevents.conversion` imports that do not match the current CloudEvents Python SDK README. Updated the example to use `cloudevents.core.v1.event.CloudEvent` and `cloudevents.core.bindings.http.to_structured_event` / `from_http_event`.
- The Python example treated current SDK `CloudEvent` instances as dictionaries. The current SDK exposes access through methods such as `get_attributes()`, so the producer and consumer examples now pass `event.get_attributes()` to the helper.
- The Python producer set CloudEvents `time` as a string. The current SDK validates `time` as a `datetime.datetime`, so the example now passes `datetime.now(timezone.utc)`.
- The messaging examples used deprecated/old attribute names: `messaging.operation` and `messaging.consumer.group`. Updated them to `messaging.operation.type` with `send` / `process` and `messaging.consumer.group.name`.
- The TypeScript snippet used `SpanKind` and `tracer` without importing or defining them. Updated the import to include `SpanKind` and `trace`, and added `const tracer = trace.getTracer("notification-service");`.

## Review Notes
The OpenTelemetry CloudEvents semantic convention page marks the convention as Development, so future versions may still change these attribute names or requirement levels. The Python snippets were sanity-checked locally against the installed CloudEvents Python SDK conversion API.
