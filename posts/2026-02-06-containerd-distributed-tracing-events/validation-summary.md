# Validation Summary: How to Enable OpenTelemetry Distributed Tracing in containerd for Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- containerd
- OpenTelemetry tracing
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Kubernetes kubelet tracing
- systemd service environment configuration

## Sources Consulted
- containerd tracing documentation: https://containerd.io/docs/2.1/tracing/
- containerd tracing source documentation: https://github.com/containerd/containerd/blob/main/docs/tracing.md
- Kubernetes system component tracing documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-traces/
- Kubernetes kubelet configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector v0.111.0 changelog: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.111.0/CHANGELOG.md

## Issues Found
- The post used a non-documented `[plugins."io.containerd.internal.v1.tracing"]` section with `sampling_ratio` and `service_name`. Replaced it with documented OpenTelemetry environment variables (`OTEL_SERVICE_NAME`, `OTEL_TRACES_SAMPLER`, and `OTEL_TRACES_SAMPLER_ARG`) and added `systemctl daemon-reload` for the systemd drop-in.
- The Collector example used the removed/deprecated `logging` exporter and `loglevel` setting. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The resource processor example set both `from_attribute: ""` and a fixed `value` for `host.name`. Removed the empty `from_attribute` and kept the fixed `value`, matching the documented resource processor action format.
- The tracing explanation overstated that containerd traces every detailed lifecycle phase directly. Adjusted the wording to match containerd documentation: tracing targets gRPC calls and manually instrumented CRI operations, and exact span coverage can vary.
- Example span names were changed from unsupported service-style names to names consistent with containerd's documented CRI naming pattern and gRPC method-style spans.
- Collector internal metric guidance only mentioned accepted and sent spans. Added refused and send-failed span counters and noted Prometheus `_total` suffix behavior.

## Review Notes
The kubelet tracing configuration is technically correct, and Kubernetes documentation confirms kubelet propagates trace context over CRI gRPC requests to instrumented runtimes such as containerd. Tail sampling configuration is valid, but the tail sampling processor is available in Collector contrib and k8s distributions, not the minimal core distribution.
