# Validation Summary: How to Configure Observability in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- waypoint proxies
- Kubernetes
- Prometheus and Prometheus Operator PodMonitor
- Grafana and PromQL
- Jaeger
- OpenTelemetry Collector
- Istio Telemetry API

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio waypoint proxy configuration: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient ztunnel troubleshooting and observability: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio istioctl command reference for `ztunnel-config log`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio upstream ztunnel chart templates and values: https://github.com/istio/istio/tree/master/manifests/charts/ztunnel
- Istio upstream waypoint deployment template: https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/files/waypoint.yaml
- Prometheus Operator PodMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Removed `istio_tcp_connection_duration_milliseconds` from the ztunnel L4 metric list because Istio's documented TCP metrics are sent bytes, received bytes, opened connections, and closed connections.
- Changed the ztunnel PodMonitor port from `http-monitoring` to `ztunnel-stats`, matching the current ztunnel container port name in Istio's chart.
- Changed the waypoint PodMonitor port from `http-envoy-prom` to `metrics`, matching Istio's generated waypoint container port for the merged Prometheus endpoint on port 15020.
- Clarified tracing behavior: waypoints participate in tracing for HTTP traffic, but applications still need to propagate trace headers for joined multi-service traces.
- Added `meshConfig.enableTracing: true` to tracing-related IstioOperator snippets, matching Istio's current tracing examples.
- Updated waypoint Telemetry examples to use `targetRefs` against the Gateway named `waypoint`, because Istio documents that waypoints must be targeted with `targetRefs`.
- Corrected the OpenTelemetry section to describe trace export through the OpenTelemetry provider and metric scraping through a Prometheus receiver, rather than implying Istio routes metrics through the tracing `opentelemetry` extension provider.
- Replaced verification commands that ran `curl` inside Istio proxy containers with `kubectl port-forward` plus local `curl`, because Istio proxy images should not be assumed to include curl.
- Qualified the `istioctl ztunnel-config log` target as `$ZTUNNEL_POD.istio-system` so the command addresses the ztunnel pod in the correct namespace.

## Review Notes
The Jaeger sample URL points to Istio release 1.24, while the current Istio documentation is for Istio 1.30. The URL is still a plausible Istio sample manifest, but future updates should consider using the release that matches the installed Istio version.
