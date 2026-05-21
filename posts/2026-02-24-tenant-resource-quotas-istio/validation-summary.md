# Validation Summary: How to Set Up Tenant Resource Quotas with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes bandwidth annotations and CNI bandwidth plugin
- Istio sidecar injection and proxy resource configuration
- Istio DestinationRule connection pools
- Istio EnvoyFilter
- Envoy HTTP bandwidth limit filter
- kube-state-metrics
- Prometheus / PromQL

## Sources Consulted
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes well-known annotations for pod bandwidth shaping: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes network plugins and bandwidth shaping: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Istio sidecar injection customization: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy HTTP bandwidth limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/bandwidth_limit_filter.html
- kube-state-metrics ResourceQuota metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Prometheus operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- Clarified that the sidecar resource discussion applies to Istio sidecar mode. Istio ambient mode does not inject a sidecar into every pod.
- Corrected the sidecar resource customization wording. Istio's `sidecar.istio.io/proxyCPU`, `sidecar.istio.io/proxyMemory`, `sidecar.istio.io/proxyCPULimit`, and `sidecar.istio.io/proxyMemoryLimit` annotations are pod annotations, not namespace annotations; the `IstioOperator` example configures mesh-wide defaults.
- Corrected the DestinationRule example from a wildcard namespace host to a concrete service FQDN. DestinationRule `host` is defined as a service-registry or ServiceEntry host, and the example's claim that one wildcard rule limits any service in a namespace was too broad.
- Corrected the DestinationRule explanation to say limits are applied from each client proxy to the destination service, not as one aggregate namespace-wide tenant quota.
- Fixed the PromQL alert expression. `kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}` does not match by default because the `type` label values differ. The revised query aggregates by `namespace` and `resource` before dividing.

## Review Notes
- `kubectl` was not installed in the review workspace, so command validation was done against Kubernetes CLI usage shown in official Kubernetes documentation rather than local `kubectl --help` output.
- The EnvoyFilter example is structurally consistent with Istio EnvoyFilter insertion patterns and Envoy's bandwidth limit filter API, but EnvoyFilter remains an advanced Istio API whose exact behavior should be tested against the deployed Istio/Envoy version.
