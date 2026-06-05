# Validation Summary: How to Monitor Network Slicing Performance for 5G Services with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics API
- OpenTelemetry Go tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry Collector configuration
- 5G network slicing
- S-NSSAI, SST, SD, SMF, UPF, PDU sessions, QoS/5QI

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Go trace API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go attribute API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/attribute
- OpenTelemetry Collector routing processor documentation and deprecation notice: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/routingprocessor
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- ETSI TS 123 501 / 3GPP TS 23.501, section 5.15.2.2 standardised SST values: https://www.etsi.org/deliver/etsi_TS/123500_123599/123501/16.06.00_60/ts_123501v160600p.pdf

## Issues Found
- The post identified SST value 3 only as mMTC. 3GPP TS 23.501 lists SST 3 as MIoT, which maps to massive IoT/mMTC usage. Updated the SST bullet to say `mMTC/MIoT`.
- The Go snippet imported `go.opentelemetry.io/otel/metric` and declared a meter that was unused in the example. This would cause an unused import compilation error, so the unused import and variable were removed.
- The Go snippet used `span.SetAttribute(...)`, which is not part of the current OpenTelemetry Go `trace.Span` interface. Updated those calls to `span.SetAttributes(...)` with typed `attribute.KeyValue` values.
- The Collector configuration used the deprecated `routing` processor. Updated the example to use the current `routing` connector pattern, where the connector is configured under `connectors` and used as both an exporter from the input pipeline and a receiver for routed pipelines.
- The old routing example routed by `slice.type` as if it were a resource attribute. The post's examples attach slice metadata as metric/span attributes, so the metrics route now uses `context: datapoint` and an OTTL condition against datapoint attributes.

## Review Notes
- The Python metrics API calls are current, including `get_meter`, `create_histogram`, `create_up_down_counter`, and `create_gauge`.
- The SLA thresholds are presented as recommended operational thresholds rather than universal 3GPP guarantees. Operators should tune them to their deployed radio, transport, core, and service requirements.
