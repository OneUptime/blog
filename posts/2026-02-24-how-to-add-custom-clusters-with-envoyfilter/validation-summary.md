# Validation Summary: How to Add Custom Clusters with EnvoyFilter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- EnvoyFilter
- Envoy clusters
- Kubernetes
- Service mesh traffic routing
- TLS upstream transport sockets

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio istioctl proxy-config command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy cluster v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy service discovery documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy circuit breaker v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto

## Issues Found
- The DNS discovery descriptions said `STRICT_DNS` uses all returned A records and `LOGICAL_DNS` only uses the first returned address. I changed this to "all returned addresses" and clarified that `LOGICAL_DNS` uses the first returned address when opening a new connection, matching Envoy's service discovery behavior and avoiding an IPv4-only implication.
- The route configuration example implied the EnvoyFilter patch alone could create a route target for an arbitrary external hostname. I clarified that the `VIRTUAL_HOST` merge requires an existing outbound virtual host, such as one created by a ServiceEntry.
- The DNS pitfall said Envoy resolves DNS directly and "not through kube-dns necessarily." I changed this to state that Envoy uses the proxy's DNS resolver configuration by default, usually the pod's `/etc/resolv.conf` in Kubernetes.

## Review Notes
- The EnvoyFilter examples use the documented `networking.istio.io/v1alpha3` API and valid `applyTo: CLUSTER` / `operation: ADD` patterns.
- EnvoyFilter remains a low-level escape hatch tied to Envoy xDS details, so the post's recommendation to prefer ServiceEntry, VirtualService, and DestinationRule when they are sufficient is accurate.
