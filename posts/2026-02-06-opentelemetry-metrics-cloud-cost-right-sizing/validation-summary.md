# Validation Summary: How to Use OpenTelemetry Metrics for Cloud Cost Right-Sizing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry host metrics receiver
- OpenTelemetry resource semantic conventions
- OpenTelemetry Prometheus Remote Write exporter
- Prometheus Remote Write receiver
- PromQL
- Python
- AWS, GCP, and Azure instance right-sizing

## Sources Consulted
- OpenTelemetry Host Metrics Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Prometheus Remote Write Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Resource Detection Processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor
- OpenTelemetry system metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry host resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/host/
- OpenTelemetry cloud provider resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/cloud-provider/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Remote Write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/

## Issues Found
- The Collector config used the `resource` processor to copy attributes from themselves and to create `cloud.instance.type`, but the host metrics receiver documentation states that it does not set resource attributes by itself. Replaced this with the `resourcedetection` processor using `env`, `system`, `ec2`, `gcp`, and `azure` detectors so `cloud.provider`, `host.id`, and `host.type` can be populated from environment or cloud metadata.
- The Prometheus Remote Write exporter used the deprecated `prometheusremotewrite` component alias. Updated it to `prometheus_remote_write`.
- The Prometheus queries grouped by resource labels, but the exporter was not configured to convert resource attributes into metric labels. Added `resource_to_telemetry_conversion.enabled: true`.
- The PromQL examples used names such as `system_cpu_utilization` while the exporter default translation can append unit/type suffixes. Added `translation_strategy: UnderscoreEscapingWithoutSuffixes` so the queried metric names match the examples.
- The HTTP remote-write endpoint needs insecure transport settings in the Collector exporter example. Added `tls.insecure: true`.
- The post did not mention that Prometheus must explicitly enable the remote-write receiver before accepting writes at `/api/v1/write`. Added a short note about `--web.enable-remote-write-receiver`.
- The CPU query applied `rate()` to `system_cpu_utilization`, which is a gauge. Replaced it with a P95 subquery over summed non-idle CPU utilization to estimate busy cores.
- The memory query filtered on `state="used"`, but the OpenTelemetry semantic attribute is `system.memory.state`, which becomes the Prometheus label `system_memory_state` after underscore escaping. Updated the query accordingly.
- The network query used `system_network_io_total`, which does not match the configured no-suffix translation strategy. Updated it to query `system_network_io` and apply `rate()` to that counter.
- The Python right-sizing snippet referenced `INSTANCE_CATALOG` without importing it from the earlier module. Added `from instance_catalog import INSTANCE_CATALOG`.
- The report query used a non-standard `cloud_instance_type` label. Updated it to use `host_type`, derived from the standard `host.type` resource attribute.

## Review Notes
- The Python and YAML snippets parse successfully.
- `promtool` is not installed in this workspace, so PromQL syntax was checked against the Prometheus documentation rather than with local tooling.
- The catalog prices are suitable as illustrative examples, but real implementation should fetch current regional prices from each cloud provider because on-demand pricing changes by region, operating system, architecture, and date.
