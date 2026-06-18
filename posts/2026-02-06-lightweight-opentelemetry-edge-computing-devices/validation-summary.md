# Validation Summary: How to Configure Lightweight OpenTelemetry for Edge Computing Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder
- OpenTelemetry Collector processors, exporters, extensions, and internal telemetry
- OpenTelemetry Python SDK
- OTLP over gRPC
- systemd resource limits

## Sources Consulted
- OpenTelemetry Collector Builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html

## Issues Found
- The Collector Builder manifest used outdated v0.96.0 component versions and an invalid-looking `dist.module` value for a generated distribution. Updated the manifest to v0.153.0 components, set a generated module path, and added config providers needed by current custom collector examples.
- The post described the file exporter as a conditional fallback when the OTLP exporter fails. The file exporter writes telemetry to disk as an exporter; it is not an automatic dead-letter fallback for a failed OTLP exporter. Replaced this with the documented `file_storage` extension on the OTLP exporter's `sending_queue`.
- The network-replay shell script posted OTLP JSON to `localhost:4318` even though the collector config only enabled OTLP gRPC on `4317`, and file-exported telemetry is intended to be replayed with an OTLP JSON file receiver rather than a generic `curl` replay. Removed the script and documented persistent queue behavior instead.
- The Python example imported and instantiated `BatchSpanExporter`, which is not the Python SDK span processor class. Changed it to `BatchSpanProcessor`.
- The memory limiter comments treated `limit_mib` as the point where dropping begins. Corrected the comments to explain that the soft limit is `limit_mib - spike_limit_mib`.
- The internal telemetry snippet used `service.telemetry.metrics.address`, which current Collector documentation says is ignored as of v0.123.0. Updated it to use a Prometheus pull reader with host and port.
- The build instructions used `builder@latest` while the manifest pinned component versions. Pinned the builder install command to v0.153.0 to keep the example consistent.
- The post gave precise binary and idle-RAM figures without a stable source and after adding the persistent storage extension those numbers would be target-dependent. Replaced the figures with a measurement caveat.

## Review Notes
- I could not run `go install` or build the custom collector in this environment because `go` is not installed. The builder manifest and configuration were reviewed against official OpenTelemetry documentation instead.
- The exact memory and disk settings in the examples should still be load-tested on the target edge hardware.
