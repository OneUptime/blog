# Validation Summary: How to Prevent Sensitive Data Leakage in Auto-Instrumentation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry auto-instrumentation
- OpenTelemetry Java agent
- OpenTelemetry JavaScript SDK and HTTP instrumentation
- OpenTelemetry Python SQLAlchemy instrumentation
- OpenTelemetry SDK span and attribute limits
- OpenTelemetry Collector attributes, filter, and debug processors/exporters
- SQLAlchemy parameterized SQL

## Sources Consulted
- OpenTelemetry Java agent HTTP instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/http/
- OpenTelemetry Java agent instrumentation configuration and DB statement sanitizer: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript SpanProcessor API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.SpanProcessor.html
- OpenTelemetry Python SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python SDK trace source documentation for SpanProcessor and ReadableSpan behavior: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry and filter processor examples: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The Java HTTP header capture environment variable names were incorrect. Updated them to the documented `OTEL_INSTRUMENTATION_HTTP_CLIENT_CAPTURE_REQUEST_HEADERS`, `OTEL_INSTRUMENTATION_HTTP_CLIENT_CAPTURE_RESPONSE_HEADERS`, `OTEL_INSTRUMENTATION_HTTP_SERVER_CAPTURE_REQUEST_HEADERS`, and `OTEL_INSTRUMENTATION_HTTP_SERVER_CAPTURE_RESPONSE_HEADERS`.
- The post claimed many HTTP auto-instrumentation libraries capture all headers by default. Narrowed this to the OpenTelemetry Java behavior: arbitrary headers are captured only when configured.
- The post overstated default capture of request bodies, headers, message payloads, and SQL parameter values. Revised the language to describe HTTP metadata, selected configured headers/request parameters/body-size attributes, and SQL literals more accurately.
- The Java DB sanitizer text implied sanitization had to be enabled manually. Updated it to note that the Java agent sanitizer is enabled by default and can be set explicitly.
- The Python SQLAlchemy example incorrectly implied `enable_commenter=True` suppresses bound parameter capture. Replaced it with a parameterized SQLAlchemy example and clarified that bound parameters should be kept separate from SQL text.
- The Java route suppression environment variable `OTEL_INSTRUMENTATION_HTTP_SERVER_SUPPRESS_PATTERN` is not a documented generic Java agent option. Replaced it with an OpenTelemetry Collector filter processor example for route-based span dropping.
- The Python `SpanProcessor.on_end` example tried to mutate `span.attributes`, but Python `on_end` receives a read-only `ReadableSpan`. Replaced it with a JavaScript SDK `SpanProcessor` example that uses the mutable `onEnding` hook.
- The Collector audit example used the deprecated `logging` exporter. Updated it to use the current `debug` exporter with `verbosity: detailed`.
- Corrected the `set-cookie` attribute key from a request header attribute to `http.response.header.set-cookie`.
- Changed the span attribute value limit example from the generic `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT` to the span-specific `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT`.

## Review Notes
The JavaScript `SpanProcessor.onEnding` hook is documented but marked experimental in the OpenTelemetry JavaScript API, so production redaction should still rely on Collector-level filtering as a stable defense-in-depth layer.
