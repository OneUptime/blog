# Validation Summary: Use Baggage Propagation to Carry Business Context Across All Three Signals

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- OpenTelemetry Baggage
- W3C Baggage propagation
- OpenTelemetry Python API
- OpenTelemetry Java API
- OpenTelemetry metrics, traces, and logs
- OpenTelemetry Collector
- OpenTelemetry declarative SDK configuration

## Sources Consulted
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java Baggage Javadoc: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-api/latest/io/opentelemetry/api/baggage/Baggage.html
- OpenTelemetry declarative configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry configuration types reference: https://opentelemetry.io/docs/specs/otel/configuration/types/
- OpenTelemetry Collector contrib processor list: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md

## Issues Found
- The post claimed that an OpenTelemetry Collector Baggage Processor can automatically convert baggage entries to span, log, and metric attributes. No such current collector processor exists, and the collector receives OTLP telemetry, not the original W3C baggage request header. Replaced that section with an application-side baggage-to-attribute helper and clarified that collector processors can operate on attributes after they have been added to telemetry.
- The declarative SDK configuration used outdated and invalid syntax: `file_format: "0.3"`, string entries under `propagator.composite`, and a map form for `resource.attributes`. Updated the example to current `file_format: "1.0"` syntax with `tracecontext:` and `baggage:` entries and name/value resource attributes.
- The security section showed unsupported portable declarative configuration keys for `propagator.baggage.max_entries` and `max_entry_length`. Replaced the snippet with guidance to validate and limit baggage in application code, consistent with the W3C baggage limits and OpenTelemetry configuration schema.
- The Python gateway example imported a non-existent or incorrect `BaggagePropagator` symbol and did not handle absent request headers before setting baggage or span attributes. Removed the import, started from the current context, and guarded optional baggage/span attributes.
- The Java example omitted servlet imports and put possibly null header values into `BaggageBuilder`. Added servlet imports, used `BaggageBuilder`, and guarded optional baggage and span attributes.
- The metric example could pass a `None` baggage value as an attribute. Updated it to add `tenant.id` only when present.
- The text said baggage is not a telemetry signal itself. Current OpenTelemetry docs include baggage in the signals area, while it is still not span, metric, or log data by itself. Reworded the sentence to avoid conflicting with the docs.

## Review Notes
The remaining examples are illustrative and assume downstream HTTP clients and servers are instrumented or otherwise configured to inject and extract the active OpenTelemetry context. The post now avoids promising automatic conversion from baggage to telemetry attributes outside the application process.
