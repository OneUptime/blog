# Validation Summary: How to Configure Endpoint Discovery Service Across Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Envoy xDS and Endpoint Discovery Service
- Istio multicluster and multi-network service discovery
- Kubernetes Services, Endpoints, EndpointSlices, Pods, and readiness probes
- Istio Sidecar and DestinationRule resources
- istioctl and kubectl debugging commands

## Sources Consulted
- Istio multicluster primary-remote multi-network installation: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/
- Istio multicluster troubleshooting: https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio configuration scoping and Sidecar import behavior: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl endpoint JSON writer source: https://github.com/istio/istio/blob/master/istioctl/pkg/writer/envoy/configdump/endpoint.go
- Istio pilot feature flag source: https://github.com/istio/istio/blob/master/pilot/pkg/features/
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/

## Issues Found
- The `jq` example for inspecting endpoint JSON used `.hostName` and `.endpoint`, but `istioctl proxy-config endpoints -o json` emits Envoy `ClusterLoadAssignment` objects with `clusterName` and nested `endpoints[].lbEndpoints[]`. Changed the command to select by `.clusterName` and print the matching load-balancer endpoint objects.
- The Istio `Sidecar` and `DestinationRule` examples used `networking.istio.io/v1beta1`. The current Istio documentation uses `networking.istio.io/v1` for these resources, so the snippets were updated to the current API version.

## Review Notes
The post assumes sidecar-mode Istio multicluster behavior. Ambient multicluster and multi-network support is evolving separately, so future updates should call out data-plane mode if the post is expanded.
