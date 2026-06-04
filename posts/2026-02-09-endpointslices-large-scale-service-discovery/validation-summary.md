# Validation Summary: How to Configure EndpointSlices for Large-Scale Service Discovery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes EndpointSlices
- Kubernetes Services and legacy Endpoints
- Kubernetes dual-stack Services
- Kubernetes Topology Aware Routing
- kube-controller-manager configuration and metrics
- kubectl
- client-go informers
- Prometheus metrics
- jq

## Sources Consulted
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes Service documentation, including Endpoints deprecation and over-capacity behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes v1.33 Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The post described the legacy Endpoints API without noting its current deprecation status or its over-capacity behavior. Added that Kubernetes 1.33 deprecates Endpoints in favor of EndpointSlices and that Endpoints objects are truncated above 1,000 backing endpoints.
- The post said EndpointSlices are created for every Service. Updated this to Services with selectors, which matches the Kubernetes controller behavior.
- The dual-stack section implied separate IPv4 and IPv6 EndpointSlices are always created from the Service manifest alone. Added the requirement that the cluster and backing pods have dual-stack networking.
- The metrics section queried kube-apiserver for `endpoint_slice_controller_*` metrics. These are kube-controller-manager metrics, so the command and text now point to the controller manager metrics endpoint.
- The client-go informer example used `NewSharedInformerFactory` from the discovery/v1 informer package, which is incorrect. Updated it to use `k8s.io/client-go/informers` and `factory.Discovery().V1().EndpointSlices()`.
- The Go example dereferenced `endpoint.Conditions.Ready` and `endpoint.NodeName` without nil checks. Updated the sample to handle nil according to EndpointSlice API semantics and avoid panics.
- The delete handler assumed all delete events contain an `*EndpointSlice`. Added handling for `cache.DeletedFinalStateUnknown`.
- The performance section used specific percentage improvements without an authoritative source. Replaced those hard numbers with technically accurate qualitative benefits.

## Review Notes
The tutorial remains version-sensitive. Topology Aware Routing is still enabled with `service.kubernetes.io/topology-mode: Auto`, but Kubernetes also documents newer Service traffic distribution fields that may be worth covering in a future update.
