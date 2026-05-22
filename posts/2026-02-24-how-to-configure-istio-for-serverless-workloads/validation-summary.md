# Validation Summary: How to Configure Istio for Serverless Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Istio ambient mode
- Kubernetes Deployments and probes
- IstioOperator mesh configuration
- Istio Sidecar, DestinationRule, VirtualService, and Telemetry resources
- Envoy proxy statistics

## Sources Consulted
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar injection customization: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio mesh ProxyConfig fields: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio ambient mode overview and labels: https://istio.io/latest/docs/ambient/overview/ and https://istio.io/latest/docs/reference/config/labels/
- Istio health check probe rewrite documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The Kubernetes `apps/v1` Deployment examples omitted required `spec.selector` fields and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the examples are valid Deployment manifests.
- The monitoring section described `istioctl proxy-config log <pod-name> --level debug` as a latency check. That command retrieves or updates Envoy log levels, not latency. Replaced it with `istioctl proxy-config route <pod-name> -n functions` as a valid proxy configuration inspection command.
- The Envoy stats example used a direct `curl localhost:15000/stats` call. Istio's documentation recommends accessing the proxy admin stats endpoint through `pilot-agent request GET stats`; updated the command accordingly.
- The telemetry optimization section implied that `proxyStatsMatcher` disables features. Istio uses `proxyStatsMatcher` to enable additional Envoy stats beyond the minimal default set. Adjusted the wording to explain that it should be kept narrow to avoid extra metric cardinality.

## Review Notes
- Ambient mode is correctly described as removing per-pod sidecars and using ztunnel, but L7 traffic management features in ambient mode require waypoint proxies.
- The trace sampling example uses `sampling: 1.0`, which is a 1% random sampling rate, not full tracing.
