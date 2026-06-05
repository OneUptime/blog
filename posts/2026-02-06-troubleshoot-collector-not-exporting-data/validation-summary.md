# Validation Summary: How to Troubleshoot the OpenTelemetry Collector Not Exporting Data

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP exporters
- Collector internal telemetry metrics and logs
- Collector sending queues and persistent queues
- Collector debug exporter
- Collector transform, filter, batch, probabilistic sampling, and tail sampling processors
- Kubernetes Deployments, Services, NetworkPolicies, Secrets, and HPAs
- Prometheus alerting rules
- Bash, curl, nc, Docker, kubectl, and OpenSSL commands

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry exporterhelper sending queue and persistent queue documentation: https://go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Docker CLI logs documentation: https://docs.docker.com/reference/cli/docker/container/logs/

## Issues Found
- The debug logging example used `disable_timestamp`, which is not a supported current Collector internal log setting. Replaced it with supported `disable_caller` and `disable_stacktrace` fields.
- Several OTLP exporter examples used the older `otlp` or informal `otlp/http` component identifiers. Updated exporter IDs to current `otlp_grpc` and `otlp_http` examples while preserving the OTLP receiver name.
- The Kubernetes Deployment snippets omitted required `spec.selector` and matching pod template labels. Added selectors and labels so the manifests are valid `apps/v1` Deployments.
- The Collector image tag in the Kubernetes secret example was outdated. Updated it from `0.93.0` to `0.153.0`.
- The persistent queue example set `file_storage.compaction.directory` to `50GiB`, but that field expects a filesystem path. Replaced it with a compaction directory path, enabled `on_start`, and added `create_directory: true`.
- The configuration examples referenced the deprecated `logging` exporter. Replaced it with the current `debug` exporter and updated the pipeline references.
- The Jaeger exporter example used the removed native Jaeger exporter. Replaced it with an OTLP gRPC exporter targeting Jaeger OTLP ingestion.
- The transform processor example used older context-specific syntax. Updated it to current OTTL path syntax with `resource.attributes` and `span.attributes`.
- The filter processor example described keeping valid spans but used conditions that would drop valid spans. Updated it to current `trace_conditions` syntax and inverted the conditions to drop spans missing required attributes.
- The troubleshooting script passed a `host:port` endpoint directly to `nc`. Updated the script to strip any URL scheme/path and pass host and port as separate `nc` arguments.

## Review Notes
- Collector component names and internal telemetry schemas are still evolving, so examples should be rechecked during future Collector upgrades.
- The HPA example assumes a custom metrics pipeline exposes `otelcol_exporter_queue_size` as a Kubernetes pod metric.
