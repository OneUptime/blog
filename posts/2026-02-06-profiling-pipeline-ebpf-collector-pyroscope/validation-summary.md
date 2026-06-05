# Validation Summary: How to Build a Complete Profiling Pipeline: eBPF Agent to Collector to

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry profiles signal
- OpenTelemetry eBPF profiler
- Kubernetes DaemonSet, Deployment, StatefulSet, Service, and RBAC manifests
- Grafana Pyroscope
- OTLP gRPC

## Sources Consulted
- OpenTelemetry blog, "The State of Profiling": https://opentelemetry.io/blog/2024/state-profiling/
- OpenTelemetry blog, "OpenTelemetry Profiles Enters Public Alpha": https://opentelemetry.io/blog/2026/profiles-alpha/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- Grafana Pyroscope OpenTelemetry eBPF profiler documentation: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Grafana Pyroscope configuration parameters: https://grafana.com/docs/pyroscope/latest/configure-server/reference-configuration-parameters/
- Grafana Pyroscope server API: https://grafana.com/docs/pyroscope/latest/reference-server-api/

## Issues Found
- The eBPF profiler DaemonSet used an outdated standalone profiler image and `OTEL_PROFILER_*` environment variables. Updated it to the supported specialized OpenTelemetry Collector eBPF profiler distribution with a `profiling` receiver and the `service.profilesSupport` feature gate.
- The Collector image version was `0.96.0`, but profile pipeline support was added later. Updated the Collector to `0.147.0` and enabled `service.profilesSupport`.
- The Pyroscope exporter used `otlphttp` with an HTTP endpoint. Updated it to OTLP gRPC because the Pyroscope eBPF profiler documentation shows OTLP gRPC ingestion on port 4040.
- The Kubernetes metadata association used `host.name`, which does not identify the profiled container or pod. Updated it to associate on `container.id`, matching the documented eBPF profiler enrichment pattern.
- The Collector deployment omitted the Service needed by the profiler endpoint and the RBAC needed by the `k8sattributes` processor. Added a ServiceAccount, ClusterRole, ClusterRoleBinding, and Service.
- The Pyroscope StatefulSet referenced a config mount without defining the volume and omitted the Service used by the Collector exporter. Added the missing ConfigMap volume and Service.
- The Pyroscope configuration described `max_query_lookback` as retention. Corrected the comment to query lookback and added an ingestion relabeling rule to populate `service_name` from `process.executable.name`.
- The verification step used an undocumented `/api/v1/labels` endpoint. Replaced it with the documented `QuerierService/ProfileTypes` API call.

## Review Notes
OpenTelemetry profiles remain an alpha signal and have had breaking protocol changes. The corrected examples use current documented versions and feature gates, but production deployments should pin compatible profiler, Collector, and Pyroscope versions and validate upgrades carefully.
