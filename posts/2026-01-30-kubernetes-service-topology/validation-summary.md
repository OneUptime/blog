# Validation Summary: How to Implement Kubernetes Service Topology

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Topology Aware Routing / Topology Aware Hints
- EndpointSlices
- kube-proxy
- Pod topology spread constraints
- Service internal traffic policy
- Prometheus metrics

## Sources Consulted
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes Service documentation, including traffic distribution: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service Internal Traffic Policy documentation: https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/endpoint-slice-v1/
- Kubernetes Pod Topology Spread Constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics EndpointSlice metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpointslice-metrics.md

## Issues Found
- The post described modern topology-aware routing as if it still used `topologyKeys` preference ordering. Updated the wording to distinguish current EndpointSlice hint based routing from the removed legacy `topologyKeys` Service field.
- The "Topology Keys" section implied those keys are the current implementation mechanism. Renamed the section to "Topology Labels" and clarified that direct key ordering applies to the legacy `topologyKeys` field.
- The recommended method used the old "Topology Aware Hints" name without noting the current "Topology Aware Routing" terminology. Updated the method name and added the Kubernetes 1.27 terminology note.
- The same-node example combined `service.kubernetes.io/topology-mode: Auto` with `internalTrafficPolicy: Local`. Kubernetes does not use Topology Aware Hints for a Service with `internalTrafficPolicy: Local`, so the annotation was removed and the behavior was clarified as strict same-node routing with dropped traffic when no node-local endpoints exist.
- The hint allocation explanation overstated endpoint proportion as an input. Updated it to reflect the documented allocatable CPU based heuristic and safeguards.
- The fallback behavior section implied simple fallback whenever local endpoints are unavailable. Updated it to match kube-proxy's documented safeguard behavior: when hint filtering is unsafe, kube-proxy falls back to all zones.
- The Prometheus metric names used underscores that do not match current kube-proxy metrics and listed EndpointSlice controller metrics that are not in the Kubernetes metrics reference. Updated kube-proxy metric names and replaced EndpointSlice entries with kube-state-metrics EndpointSlice metrics that expose endpoints and hints.

## Review Notes
- The post still uses the annotation-based `service.kubernetes.io/topology-mode: Auto` approach, which is valid, but Kubernetes 1.36 also documents `.spec.trafficDistribution` with `PreferSameZone` and `PreferSameNode` as a newer Service API option. The annotation takes precedence if both are set and may be deprecated in the future.
