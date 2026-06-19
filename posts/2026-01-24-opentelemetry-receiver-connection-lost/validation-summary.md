# Validation Summary: How to Fix 'Receiver Connection Lost' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry JavaScript SDK and OTLP gRPC exporter
- gRPC and HTTP telemetry transport
- Kubernetes Services, Deployments, probes, and PodDisruptionBudgets
- GKE BackendConfig
- Collector health check, pprof, zPages, memory limiter, batch processor, and exporter retry/queue settings

## Sources Consulted
- OpenTelemetry Collector OTLP receiver reference: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.md
- OpenTelemetry Collector OTLP exporter reference: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector exporter helper retry and queue reference: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector health check extension reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector memory limiter processor reference: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor reference: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript OTLP gRPC trace exporter package README: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-grpc
- OpenTelemetry JavaScript SDK trace base package types: https://www.npmjs.com/package/@opentelemetry/sdk-trace-base
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- GKE Ingress BackendConfig documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration

## Issues Found
- The connectivity check used `grpc.health.v1.Health/Check` against the OTLP gRPC receiver. The OTLP receiver does not generally expose that standard gRPC health service on port 4317, so the command could fail even when OTLP is working. Replaced it with a check against the Collector health check extension endpoint.
- The OTLP/HTTP curl command implied that a plain GET to `/v1/traces` was a valid endpoint test. OTLP/HTTP exports use POST, so the text now clarifies that GET may return 405 while still confirming reachability.
- The JavaScript OTLP gRPC exporter example used `grpc://otel-collector:4317`, a string compression value, and function metadata. The current exporter README documents `http://host:4317` for insecure gRPC, `CompressionAlgorithm.GZIP`, and a `grpc.Metadata` object when metadata is needed. Updated the example accordingly and removed the invalid metadata function.
- The SDK section claimed to configure retry settings through `BatchSpanProcessor`, but the shown settings are queue and timeout settings, not retry configuration. Updated the heading and wording.
- The memory limiter comments described `spike_limit_mib` as the soft limit. Official docs define the soft limit as `limit_mib - spike_limit_mib`; updated the comments.
- The health check extension example used `check_collector_pipeline`, which official docs warn is not working as expected and recommend not using. Removed that option.
- The Collector metrics endpoint was referenced through port 8888, but current Collector docs show the default Prometheus listener is loopback unless configured. Added `service.telemetry.metrics.readers` with a Prometheus pull exporter on `0.0.0.0:8888`.
- The Kubernetes Service example included an AWS load balancer annotation on a `ClusterIP` Service, where it would not apply. Removed the misleading annotation.
- The custom JavaScript exporter wrapper awaited `export()`, but the `SpanExporter` interface is callback-based and returns `void`. Updated the wrapper to return `void` and use `ExportResultCode` instead of magic numeric result codes.
- The conclusion implied SDK retry configuration was the main fix. Updated it to distinguish SDK timeout/buffering settings from Collector exporter retry policies.

## Review Notes
- The updated Collector configuration was validated with `otel/opentelemetry-collector-contrib:latest validate --config=/etc/otelcol/config.yaml`.
- The JavaScript OTLP gRPC exporter package is still marked experimental by its package README, so future minor releases may introduce breaking changes.
