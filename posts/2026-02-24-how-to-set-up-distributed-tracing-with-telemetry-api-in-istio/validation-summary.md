# Validation Summary: How to Set Up Distributed Tracing with Telemetry API in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig extension providers
- Distributed tracing and trace-context propagation
- Jaeger
- Zipkin
- OpenTelemetry Collector
- Kubernetes manifests and kubectl
- Python Flask and requests

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Configure tracing with Telemetry API task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio Telemetry API task: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Global Mesh Options / MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector contrib distribution Dockerfile: https://github.com/open-telemetry/opentelemetry-collector-releases/tree/main/distributions/otelcol-contrib

## Issues Found
- The Istio addon install commands pinned `release-1.22`, which is outdated for a 2026 post. Updated the Jaeger and Zipkin addon URLs to `release-1.30`, matching the current Istio documentation at review time.
- The OpenTelemetry Collector manifest placed resources in the `observability` namespace without creating it. Added a `Namespace` resource.
- The Collector example mounted config at `/etc/otelcol` but did not pass `--config=/etc/otelcol/config.yaml`; the contrib image defaults to `/etc/otelcol-contrib/config.yaml`. Added explicit args so the mounted ConfigMap is used.
- The Collector example used an old `otel/opentelemetry-collector-contrib:0.93.0` image. Updated it to `0.143.0`, consistent with current OpenTelemetry Collector documentation at review time.
- The Collector OTLP exporter targeted `jaeger-collector.observability:4317`, but the post's Jaeger addon installs Jaeger in `istio-system`. Changed it to `jaeger-collector.istio-system.svc.cluster.local:4317`.
- The MeshConfig provider examples omitted `enableTracing: true`, which Istio documents as controlling trace span generation. Added `enableTracing: true` and `defaultConfig.tracing: {}` to disable legacy tracing options.
- The MeshConfig update instructions only restarted `istiod`. Added a workload rollout command so sidecars pick up tracing bootstrap configuration changes.
- The port-forward example used `svc/tracing 16686:16686`, but Istio's Jaeger addon exposes the `tracing` service on port `80` targeting Jaeger UI port `16686`. Changed it to `svc/tracing 16686:80`.
- Clarified that B3 is the default for the Zipkin provider, rather than universally default for all providers.

## Review Notes
The Telemetry API `apiVersion`, `providers`, `randomSamplingPercentage`, and `customTags` examples match the current Istio 1.30 API shape. The trace-header propagation guidance matches Istio's current overview: applications must forward request tracing headers for proxies to join spans into a single trace.
