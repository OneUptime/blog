# Validation Summary: How to Set Up OpenTelemetry Collector for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- OTLP receiver and OTLP/HTTP exporter
- Collector processors: memory_limiter, batch, resource
- Collector extensions: health_check, zpages, pprof, file_storage, bearertokenauth
- Kubernetes Deployment, Service, HorizontalPodAutoscaler, NetworkPolicy
- TLS and bearer token authentication

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector OTLP receiver configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.md
- OpenTelemetry Collector exporter helper queue and retry documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector health_check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector file_storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector bearer token authenticator extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/README.md
- OpenTelemetry Collector Contrib v0.154.0 release page: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.154.0
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The Kubernetes deployment used the outdated `otel/opentelemetry-collector-contrib:0.96.0` image. Updated it to `0.154.0`, the current Collector Contrib release available during review.
- The base configuration used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `service.telemetry.metrics.readers` Prometheus pull exporter configuration and set `without_type_suffix` and `without_units` to preserve the metric names used later in the post.
- The `collector.version` resource attribute claimed version `1.0.0`, which did not match the Collector image. Updated it to `0.154.0`.
- The persistent queue snippet configured `file_storage` but did not enable the extension in `service.extensions`. Added `service.extensions: [file_storage]`.
- The persistent queue snippet used `/var/lib/otel/queue` without ensuring the directory exists. Added `create_directory: true`, matching the file_storage extension's current behavior.
- The TLS snippet said to enable TLS for all incoming connections but only configured OTLP/gRPC. Added equivalent TLS settings for OTLP/HTTP.
- The bearer token authentication snippet configured the `bearertokenauth` extension but did not enable it in `service.extensions`. Added `service.extensions: [bearertokenauth]`.
- The monitoring section listed `otelcol_processor_dropped_spans`, which is not listed in the current official Collector internal metrics documentation. Replaced it with `otelcol_exporter_enqueue_failed_spans` and noted the `metric_points` and `log_records` variants for metrics and logs.

## Review Notes
- The main Collector configuration was validated with `otel/opentelemetry-collector-contrib:0.154.0 validate`.
- The persistent queue and bearer token authentication snippets were also validated in minimal Collector harnesses against `otel/opentelemetry-collector-contrib:0.154.0`.
- Kubernetes YAML was reviewed against the current Kubernetes API documentation. It is syntactically consistent with current APIs, but the ConfigMap, Secret, namespace, and persistent volume setup are intentionally left as environment-specific prerequisites.
