# Validation Summary: How to Monitor RAN Cell Site Performance with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python Metrics API and SDK
- OpenTelemetry OTLP gRPC metric exporter
- OpenTelemetry Collector OTLP receiver and exporter
- OpenTelemetry Collector resource and transform processors
- 3GPP PM XML measurement files for RAN performance counters
- 5G NR / RAN performance KPIs

## Sources Consulted
- OpenTelemetry Python Metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL datapoint context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint
- 3GPP TS 32.435 / ETSI TS 132 435 PM XML file format references: https://www.3gpp.org/DynaReport/32-series.htm and https://www.etsi.org/deliver/etsi_ts/132400_132499/132435/14.00.00_60/ts_132435v140000p.pdf

## Issues Found
- The Python OTLP gRPC exporter endpoint used `oneuptime-collector:4317` without a scheme or `insecure=True`, which would default to secure transport in current OTLP exporter configuration. Changed it to `http://oneuptime-collector:4317` for an insecure local Collector endpoint.
- The PM XML parser used the incorrect namespace `http://www.3gpp.org/ftp/specs`. Updated it to the 3GPP TS 32.435 measurement collection namespace `http://www.3gpp.org/ftp/specs/archive/32_series/32.435#measCollec`.
- The code declared uplink PRB utilization and RRC setup success rate gauges but never exported values for them. Added representative vendor-counter mappings for uplink PRB utilization and RRC setup success rate, consistent with the existing note that counter indices are vendor-specific.
- The Collector configuration comments claimed the resource processor performed a file-based geographic lookup. The resource processor only applies resource attribute actions, so the text and example were corrected to show static site metadata and to point per-cell lookup-table use cases to the lookup processor or a custom processor.
- The transform processor condition used `Double() > 80.0`, which is not a valid OTTL datapoint value path. Updated it to use `datapoint.value_double` and `datapoint.attributes` in the datapoint context.
- The Collector OTLP exporter example used `tls.insecure: false` with an internal `oneuptime-collector:4317` endpoint. Updated it to `tls.insecure: true` to match the local insecure OTLP gRPC example.
- Removed an unused `time` import from the Python snippet.

## Review Notes
The RAN counter IDs remain illustrative and vendor-specific, which the post states. In a production collector, operators should map counters by the vendor PM definition file and confirm whether their OTLP destination requires TLS, mTLS, or an insecure in-cluster connection.
