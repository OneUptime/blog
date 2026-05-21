# Validation Summary: How to Optimize Istio Resource Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- Prometheus
- Grafana
- Istio ambient mode

## Sources Consulted
- Istio Global Mesh Options: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio Configuration Scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio add workloads to ambient mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection customization: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/

## Issues Found
- The sidecar CPU percentile PromQL used `quantile`, which computes across the current instant vector rather than over time. Changed it to a `quantile_over_time` query using a one-hour subquery over per-pod CPU rates.
- The post stated Envoy defaults to 2 worker threads. Current Istio documentation says the proxy concurrency is automatically determined from CPU requests and limits when unset. Updated the wording while keeping the valid `concurrency: 1` optimization example.
- The `Sidecar` resource example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API version from Istio's official reference examples.
- The unused-features section claimed Istio features are broadly enabled by default and set `enablePrometheusMerge: true` under a "disable" example. Updated the wording and changed the example to `enablePrometheusMerge: false` for users who do not need metric merging.
- The discovery selector explanation said istiod reduces Kubernetes API watches. Official Istio documentation says istiod still opens a watch for all namespaces, but ignores unselected objects early in processing. Corrected the explanation.
- The ambient mode section described waypoint proxies as per-service and claimed an exact 80-90% cost reduction. Current Istio docs describe optional waypoint proxies for L7 processing and do not guarantee that exact reduction. Updated the wording to avoid overclaiming.

## Review Notes
The overall guidance is technically relevant and aligned with Istio cost optimization practices. Numeric savings remain workload-dependent and should be treated as illustrative rather than guaranteed.
