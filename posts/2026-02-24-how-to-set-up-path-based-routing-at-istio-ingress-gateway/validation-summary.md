# Validation Summary: How to Set Up Path-Based Routing at Istio Ingress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio Ingress Gateway
- Kubernetes manifests and `kubectl`
- `istioctl`
- Envoy HTTP routing and prefix rewrite behavior

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP route components reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The path rewrite examples used prefixes such as `/api/v1`, `/docs`, and `/old-path` with `rewrite.uri: /`. Envoy prefix rewrites replace the matched prefix, and the official Envoy documentation warns that trailing slashes matter when stripping a prefix. I changed those rewrite-only examples to match `/api/v1/`, `/docs/`, and `/old-path/`, and adjusted `/new-path` to `/new-path/`, so the documented examples produce `/users`, `/getting-started`, and `/new-path/page` as claimed.
- The post claimed that Envoy optimizes prefix and exact matches with a prefix tree. The official Envoy route documentation describes route lists as matched in order, with a separate matcher tree option. I softened the statement to say prefix and exact matches are simpler and generally cheaper than regex matching.

## Review Notes
- The Istio `networking.istio.io/v1` `Gateway` and `VirtualService` examples use current API versions and valid fields.
- The `VirtualService` match, header, weighted route, timeout, retry, and rewrite fields match the current Istio reference.
- Short destination host names are valid when the services are resolved in the intended namespace, but fully qualified service names can be clearer in cross-namespace examples.
