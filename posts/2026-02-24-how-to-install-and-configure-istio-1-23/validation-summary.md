# Validation Summary: How to Install and Configure Istio 1.23

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio 1.23
- Kubernetes
- Helm
- Istio ambient mesh
- Istio sidecar injection
- Kubernetes Gateway API
- Istio security APIs
- Istio Telemetry API
- Prometheus, Grafana, Kiali, Jaeger

## Sources Consulted
- Istio 1.23 release announcement: https://istio.io/latest/news/releases/1.23.x/announcing-1.23/
- Istio 1.23 ambient Helm installation docs: https://archive.istio.io/v1.23/docs/ambient/install/helm/
- Istio 1.23 Kubernetes Gateway API task: https://archive.istio.io/v1.23/docs/tasks/traffic-management/ingress/gateway-api/
- Istio 1.23 Telemetry API reference: https://archive.istio.io/v1.23/docs/reference/config/telemetry/
- Istio 1.23 tracing with Telemetry API docs: https://archive.istio.io/v1.23/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio 1.23 PeerAuthentication reference: https://archive.istio.io/v1.23/docs/reference/config/security/peer_authentication/
- Istio 1.23 RequestAuthentication reference: https://archive.istio.io/v1.23/docs/reference/config/security/request_authentication/
- Istio 1.23 ambient workload enrollment docs: https://archive.istio.io/v1.23/docs/ambient/usage/add-workloads/
- Istio 1.23 waypoint proxy docs: https://archive.istio.io/v1.23/docs/ambient/usage/waypoint/
- Istio 1.23 Helm chart values from official chart repository: https://istio-release.storage.googleapis.com/charts/
- Istio 1.23 sample addons manifests: https://github.com/istio/istio/tree/release-1.23/samples/addons

## Issues Found
- The ambient installation flow installed CNI and ztunnel but did not install `istiod` with the ambient Helm profile. I added `--set profile=ambient` to the `istiod` Helm command and clarified the ambient component step.
- The `istio-base` and gateway Helm installs omitted `--wait`, while the official Helm installation flow waits for chart readiness. I added `--wait`.
- The gateway values overrode the default service ports without preserving the `status-port` on `15021`, which is part of the official gateway chart defaults. I restored `status-port`, added explicit `protocol: TCP`, and used the chart's `http2` name for port 80.
- The Telemetry example used `telemetry.istio.io/v1alpha1` even though Istio 1.23 documents the stable `telemetry.istio.io/v1` API. I updated the apiVersion.
- The Telemetry tracing example referenced a `zipkin` provider without configuring a matching `meshConfig.extensionProviders` entry. I added a Zipkin provider pointed at the sample Jaeger/Zipkin service on port `9411`.

## Review Notes
The post is version-specific to Istio 1.23, which is archived and no longer a currently supported Istio release. The reviewed commands and manifests are valid for the 1.23 documentation baseline. Local `helm` and `kubectl` binaries were not available in the review environment, so command behavior was verified against official docs and chart manifests rather than by executing against a cluster.
