# Validation Summary: How to Right-Size Istio Sidecar Resource Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and Envoy proxy configuration
- Kubernetes resource requests and limits
- Kubernetes Vertical Pod Autoscaler
- Prometheus and PromQL
- kubectl and istioctl proxy diagnostics

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ProxyConfig API reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio 1.30 default chart values: https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/istio-control/istio-discovery/values.yaml
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The opening sentence implied every Istio mesh pod always runs an Envoy sidecar. Istio also supports ambient mode, so I scoped the statement to an Istio sidecar mesh.
- The PromQL examples for "95th percentile over the last 24 hours" used the `quantile` aggregation operator, which calculates across instant-vector series rather than over a 24-hour time range. I changed the CPU and memory examples to use `quantile_over_time`, and updated the peak CPU query to use `max_over_time` over a 24-hour subquery.
- The concurrency section said the default is 2. Current Istio ProxyConfig documentation says an unset value is automatically determined from CPU limits, with `0` meaning all cores. I updated the wording while preserving the practical advice to set low-traffic services to `1` when appropriate.
- The Sidecar resource example used `networking.istio.io/v1beta1`. Current Istio documentation uses `networking.istio.io/v1`, so I updated the API version.
- The VPA section recommended switching from `Off` to `Auto`. Kubernetes documentation marks `Auto` as deprecated since VPA 1.4.0 and recommends `Recreate` or `InPlaceOrRecreate`, so I updated that guidance.
- The VPA example omitted `controlledValues`. Since the default is `RequestsAndLimits`, VPA could adjust sidecar limits as well as requests. I added `controlledValues: RequestsOnly` to match the post's focus on right-sizing requests.

## Review Notes
The remaining resource values are examples and should be treated as starting points, not universal recommendations. The Istio sidecar resource annotations used in the post are still documented but marked Alpha. `kubectl` was not installed locally, so CLI validation was performed against official Kubernetes documentation; revised PromQL was syntax-checked with `promtool` from the official Prometheus container image.
