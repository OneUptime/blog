# Validation Summary: How to Configure Topology-Aware Hints for Locality-Based Traffic Routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes topology-aware routing / topology-aware hints
- kube-proxy
- kubectl
- Prometheus metrics and PromQL
- Istio metrics
- AWS cross-zone data transfer pricing

## Sources Consulted
- Kubernetes Topology Aware Routing: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Prometheus PromQL operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Istio standard metrics: https://istio.io/latest/docs/reference/config/metrics/
- AWS EC2 On-Demand Pricing, Data Transfer: https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
- The post described topology-aware hints as preferring same-zone, same-region, or arbitrary topology-domain endpoints. Kubernetes topology-aware routing allocates EndpointSlice hints to zones, so the description was narrowed to same-zone routing.
- The fallback behavior was described as automatic routing to other zones whenever local endpoints are unhealthy. Kubernetes falls back to cluster-wide routing when hints are unavailable, incomplete, or unsafe to apply, so the fallback language was corrected.
- The post said kube-proxy or the CNI selects endpoints using hints. Official docs describe kube-proxy and other EndpointSlice consumers, so the wording was corrected.
- EndpointSlice lookup and test-client commands omitted the `production` namespace even though the Service and Deployment were created there. The commands and test Pod manifests were updated to use `production`.
- The Auto mode requirements incorrectly said the EndpointSlice controller needs CPU headroom and recommended only 2 endpoints per zone. Kubernetes uses node zone labels and allocatable CPU information for proportional allocation, and recommends 3 or more endpoints per zone, so those requirements were corrected.
- The PromQL query used `{client_zone=server_zone}`, which is not valid PromQL label comparison syntax. The Go metrics example now emits a `route_locality` label, and the query filters on `route_locality="same_zone"`.
- The zone-failure example deleted Pods from a single placeholder node while claiming to delete Pods in a zone. The command now iterates over nodes in the zone and deletes matching Pods with the supported `spec.nodeName` field selector.
- The multi-region section claimed `service.kubernetes.io/topology-mode: Auto` can use custom topology keys and create same-zone, same-region, then global fallback behavior. Kubernetes does not implement that hierarchy, so the section was corrected to distinguish topology spread constraints from zone-based Service routing.
- The multi-region Deployment example was incomplete for `apps/v1` because it lacked a selector and Pod template labels. Those fields were added.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI validation was performed against official Kubernetes command and API documentation rather than local `kubectl --help` output.
- Kubernetes documentation now generally uses the name "Topology Aware Routing"; "Topology Aware Hints" remains common in API fields, events, and pre-1.27 terminology.
