# Validation Summary: How to Use OpenTelemetry Exception Semantic Conventions to Standardize Error

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry trace exception semantic conventions
- OpenTelemetry Python tracing API
- OpenTelemetry JavaScript tracing API
- OpenTelemetry Collector transform processor
- OpenTelemetry Transformation Language (OTTL)

## Sources Consulted
- OpenTelemetry Trace Exceptions specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Recording Errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry Error attributes registry: https://opentelemetry.io/docs/specs/semconv/attributes-registry/error/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry JavaScript API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor

## Issues Found
- The post stated that exception span events must include `exception.type` and `exception.message` and listed `exception.escaped` as an optional semantic convention attribute. Current OpenTelemetry trace exception guidance requires the event name `exception` and says `exception.type`, `exception.message`, and `exception.stacktrace` should be filled out. I updated the requirement language and removed `exception.escaped` from the semantic convention list.
- The Python example manually recorded an exception inside a `start_as_current_span` block and then re-raised it while leaving Python's default automatic exception recording enabled. That can create duplicate exception events. I set `record_exception=False` on the context manager when the example records manually.
- The examples set span status to ERROR but did not set `error.type`, which current error recording guidance recommends for failed operations. I added `error.type` in the Python, JavaScript, wrapper, and shared-library examples.
- The wrapper comments used the JavaScript-style `recordException` name in Python code and referred to required fields. I changed the comments to `record_exception` and "recommended error fields."
- The shared library described `error.handled` and `exception.type.simple` as standard classification attributes, but they are not OpenTelemetry semantic convention attributes. I changed the text to describe the remaining attribute as organization-specific and removed `exception.type.simple`.
- The validation wrapper delegated `__enter__` and `__exit__` to a wrapped span object, which is not how the Python API's span object is normally managed. I changed it to behave as a simple context manager over a started span and end the span on exit.

## Review Notes
The Collector transform example uses a valid transform processor shape with a `spanevent` context and OTTL `set(name, "exception")` statement. In production, rewriting event names alone may not create complete exception events if the original event lacks `exception.type`, `exception.message`, or `exception.stacktrace`.
