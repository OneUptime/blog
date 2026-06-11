# Validation Summary: How to Create Kubernetes EndpointSlices

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes EndpointSlice API
- Kubernetes Services and service discovery
- Topology Aware Routing
- kubectl
- Kubernetes Go client
- Prometheus Operator ServiceMonitor
- kube-controller-manager metrics

## Sources Consulted
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes EndpointSlice metrics source: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/endpointslice/metrics/metrics.go
- Kubernetes Go API package documentation: https://pkg.go.dev/k8s.io/api/discovery/v1
- Kubernetes Go pointer utilities documentation: https://pkg.go.dev/k8s.io/utils/ptr

## Issues Found
- The post described `FQDN` as a normal EndpointSlice `addressType`. The Kubernetes API still lists `FQDN`, but it is deprecated and kube-proxy only processes IPv4 and IPv6 EndpointSlices. Updated the field explanation to make that limitation clear.
- The comparison table said legacy Endpoints had an unlimited maximum endpoint count. Kubernetes now documents the Endpoints API as deprecated and over-capacity Endpoints are truncated after 1000 backing endpoints. Updated the table accordingly and clarified the EndpointSlice default of 100 endpoints, configurable up to 1000.
- The Go controller example referenced `corev1.Protocol` without importing `k8s.io/api/core/v1`, so it would not compile. Added the import and used `corev1.ProtocolTCP`.
- The Go controller example used `k8s.io/utils/pointer`, which is deprecated in favor of `k8s.io/utils/ptr`. Replaced the pointer helper calls with `ptr.To`.
- The Go controller example attempted to update an EndpointSlice immediately after a failed create without first retrieving the existing object's `resourceVersion`. Kubernetes updates require the current resource version. Added `apierrors.IsAlreadyExists` handling, a `Get`, and then an `Update`.
- The Go controller example did not remove stale slices if the external endpoint list shrank. Added cleanup for previously managed slices whose generated index is no longer needed.
- The metrics table included `endpoint_slice_controller_syncs_total` as the primary sync metric. Replaced that row with the documented/source-backed `endpoint_slice_controller_desired_endpoint_slices` metric while keeping the existing EndpointSlice change and per-sync endpoint metrics.

## Review Notes
- `kubectl` is not installed in the review environment, so kubectl commands were checked against the official kubectl reference rather than local `--help` output.
- Go is not installed in the review environment, so the Go snippet was reviewed statically against Kubernetes Go API documentation and upstream source rather than compiled locally.
- The ServiceMonitor example is structurally plausible for Prometheus Operator, but the exact labels for scraping `kube-controller-manager` vary by Kubernetes distribution and monitoring stack.
