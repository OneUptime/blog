# Validation Summary: How to Benchmark OTel Arrow vs Standard OTLP/gRPC to Measure Bandwidth Savings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OTel Arrow exporter and receiver
- OTLP/gRPC exporter behavior
- telemetrygen
- Collector file exporter and OTLP JSON file receiver
- Prometheus-format Collector internal metrics
- iptables byte counters

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OTel Arrow exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/otelarrowexporter
- OTel Arrow receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/otelarrowreceiver
- OpenTelemetry gRPC configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OTLP gRPC exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter
- Batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- telemetrygen documentation and source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen
- File exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/fileexporter
- OTLP JSON file receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/otlpjsonfilereceiver
- OpenTelemetry blog post on OTel Arrow in production: https://opentelemetry.io/blog/2024/otel-arrow-production/

## Issues Found
- The baseline config used the core `otlp` exporter while the automated script expected byte metrics that are documented for the `otelarrow` exporter. I changed the baseline to `otelarrow/standard` with `arrow.disabled: true`, preserving standard OTLP/gRPC transport while exposing comparable OTel Arrow wire-byte metrics.
- The Collector config did not enable the `normal` internal telemetry level required for the documented OTel Arrow byte metrics. I added `service.telemetry.metrics.level: normal`.
- The post referenced `otelcol_exporter_sent_bytes` and `otelcol_exporter_sent_bytes_total`, which are not the documented OTel Arrow wire-byte metrics. I replaced them with `otelcol_exporter_sent_wire_total` in Prometheus output examples.
- The telemetrygen examples combined `--duration` with `--traces`, but telemetrygen ignores the trace count when duration is provided. I removed the `--traces` flags and changed the script output so it describes the configured target rate and duration instead of an exact total span count.
- The script used shell arithmetic on Prometheus metric values. I changed the byte delta and savings calculations to use `awk`, which handles numeric Prometheus samples safely.
- The replay section referred to a generic file receiver. The file exporter documentation points to the `otlpjsonfile` receiver for replaying OTLP JSON output, so I corrected the component name and added the minimal receiver config.
- The iptables example used numeric output (`-n`) and then grepped for hostnames, which would not match. I changed the example to resolve the receiver IPs first and grep those IPs.

## Review Notes
- I could not run `telemetrygen --help` locally because Go is not installed in this workspace, so telemetrygen validation was done against the official README and current source code.
- The CPU overhead percentage remains a benchmark expectation rather than a guaranteed value; the post correctly frames the trade-off as workload-dependent.
