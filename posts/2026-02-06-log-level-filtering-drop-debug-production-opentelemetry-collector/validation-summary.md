# Validation Summary: How to Use Log Level Filtering in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector count connector and internal telemetry
- OTLP receiver/exporter configuration

## Sources Consulted
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector routing processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector OTTL log context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md

## Issues Found
- The filter processor examples used the deprecated `logs.log_record` configuration form. Updated them to the current `log_conditions` form and prefixed log fields with `log.`.
- The per-service filtering example configured `routing` as a processor but used connector-style pipeline routing. Updated it to the current `routing` connector syntax under `connectors`, with an inbound pipeline exporting to the connector and routed pipelines receiving from it.
- The trace-context example compared `trace_id` to an empty string. Updated it to compare `log.trace_id` to the documented zero `TraceID(...)` value.
- The measuring section claimed a filter-specific `otelcol_processor_filter_logs_filtered` metric. Replaced this with the documented internal processor item metrics, `otelcol_processor_incoming_items` and `otelcol_processor_outgoing_items`.
- The internal telemetry example used the older `metrics.address` setting. Updated it to the current `metrics.readers.pull.exporter.prometheus` configuration.
- The text said the smart debug example approximated logs with trace ID and error status, but the example only checked trace context. Updated the wording to match the actual condition.

## Review Notes
The filter processor remains alpha for logs in the current component stability table, and the routing connector is also alpha for logs. The examples are accurate for the current documented Collector configuration style, but teams should validate configs against the exact Collector distribution and version they deploy.
