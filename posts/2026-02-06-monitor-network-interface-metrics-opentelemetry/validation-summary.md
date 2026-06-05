# Validation Summary: How to Monitor Network Interface Metrics with OpenTelemetry

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry `host_metrics` receiver
- Host metrics network scraper
- OpenTelemetry network/system metrics
- Resource Detection processor
- Docker Compose host networking
- Kubernetes DaemonSet host networking
- Linux network interface counters

## Sources Consulted
- OpenTelemetry Collector Contrib Host Metrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Contrib network scraper metric metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/networkscraper/metadata.yaml
- OpenTelemetry Collector Contrib host metrics receiver generated component metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/metadata/generated_status.go
- OpenTelemetry Collector Contrib network scraper generated metrics: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/networkscraper/internal/metadata/generated_metrics.go
- OpenTelemetry Collector Contrib Resource Detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Contrib v0.153.0 release notes: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0
- OpenTelemetry Collector v0.144.0 release notes for OTLP exporter rename: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.144.0
- Docker Compose service `network_mode` reference: https://docs.docker.com/reference/compose-file/services/#network_mode
- Kubernetes Pod API reference for `hostNetwork`: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- The post used the deprecated `hostmetrics` receiver name. Updated prose and configuration examples to use the current `host_metrics` component name.
- The post used the deprecated `resourcedetection` processor name. Updated the configuration to use `resource_detection`.
- The post used the deprecated `otlp` exporter name for OTLP/gRPC. Updated examples to the current `otlp_grpc` exporter name.
- The post described connections as TCP/UDP and called `system.network.connections` a gauge. The network scraper metadata shows `protocol` currently enumerates TCP and the metric is a cumulative, non-monotonic sum. Updated the text and metric table accordingly.
- The basic configuration comment said all metrics are enabled by default. The network scraper also has conntrack metrics that are disabled by default, so the comment now refers only to the listed network metrics.
- The container examples used the outdated `otel/opentelemetry-collector-contrib:0.96.0` image tag. Updated examples to `0.153.0`, the latest official Contrib release checked during review.
- The container guidance used `HOST_PROC` and `HOST_SYS` environment variables. Official host metrics receiver docs use `root_path` for mounted host filesystem collection, so the examples now set `root_path: /hostfs` in the Collector configuration guidance.

## Review Notes
- Verified the `otel/opentelemetry-collector-contrib:0.153.0` image component list includes `host_metrics`, `resource_detection`, `batch`, and the OTLP gRPC exporter.
- Validated representative corrected Collector configurations with `otelcol-contrib validate` in the `otel/opentelemetry-collector-contrib:0.153.0` Docker image.
- Alert thresholds remain workload-dependent examples, not universal limits.
- Bandwidth utilization still requires external knowledge of interface speed; the network scraper does not emit interface speed as part of the documented default metrics.
