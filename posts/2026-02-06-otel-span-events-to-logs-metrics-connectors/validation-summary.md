# Validation Summary: How to Convert Span Events into Log Records and Metric Data Points

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and span events
- OpenTelemetry Python API
- OpenTelemetry Collector connectors
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector count connector
- OpenTelemetry Collector exceptions connector
- OTLP exporters
- Loki LogQL
- Prometheus PromQL

## Sources Consulted
- OpenTelemetry Collector connectors list: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL span event context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspanevent/README.md
- OpenTelemetry Collector OTTL log context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector exceptions connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/exceptionsconnector/README.md
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post referenced a `spantolog` connector and showed an `events` configuration for it. No such connector exists in the official OpenTelemetry Collector connector list. Replaced those examples with the supported `exceptions` connector for exception span events.
- The post claimed the transform processor can extract span events and emit standalone log records. The transform processor modifies telemetry in the current pipeline and does not create a new log pipeline by itself. Updated the explanation and examples to use transform only for enrichment/normalization.
- The post implied arbitrary span events could be converted to log records with built-in Collector config. Current supported built-in behavior is exception-focused via the `exceptions` connector. Narrowed log conversion claims to exception span events.
- Several OTTL paths used unqualified names such as `name`, `attributes`, `severity_text`, and `body`. Updated examples to current path-qualified OTTL syntax such as `spanevent.name`, `spanevent.attributes`, `log.severity_text`, and `log.body`.
- The count connector example used an invalid span event condition, `events["exception"].name`. Replaced it with a `spanevents` metric using `spanevent.name == "exception"`.
- The metric attribute example used `payment.provider`, while the Python example records `provider`. Updated the count connector attribute key to `provider`.
- The Loki OTLP exporter example used the gRPC `otlp` exporter with an HTTP Loki endpoint. Updated the log exporter to `otlphttp/logs`.
- The multi-line OTTL `Concat` statement was not valid YAML as a plain list item. Converted it to a YAML block scalar.

## Review Notes
Validated representative corrected Collector configurations with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The article is now technically accurate for the supported built-in Collector components, but it should not be read as a general arbitrary span-event-to-log conversion recipe unless a custom connector or vendor-specific component is added.
