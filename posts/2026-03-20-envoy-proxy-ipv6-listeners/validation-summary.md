# Validation Summary: How to Configure Envoy Proxy with IPv6 Listeners

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- IPv6
- Dual-stack DNS resolution
- Istio
- Kubernetes
- xDS / Envoy bootstrap configuration

## Sources Consulted
- Envoy address proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto.html
- Envoy cluster proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy upstream connection pooling and Happy Eyeballs: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/connection_pooling
- Envoy endpoint proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto.html
- Envoy health checking overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking.html
- Istio dual-stack installation guide: https://istio.io/latest/docs/setup/additional-setup/dual-stack/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/

## Issues Found
- The dual-stack Envoy example used `dns_lookup_family: AUTO` and described it as the dual-stack setting. I changed it to `dns_lookup_family: ALL` because Envoy documents `ALL` as the mode that returns both IPv4 and IPv6 addresses and enables Happy Eyeballs for upstream connections. `AUTO` is IPv6-first DNS lookup with IPv4 fallback only when no IPv6 addresses are returned.
- The Istio section used `ISTIO_META_IPV6_SUPPORT` in a mesh `ConfigMap`, which does not match the current official dual-stack configuration guidance. I replaced it with the documented `IstioOperator` settings that use `ISTIO_DUAL_STACK: "true"` in both proxy metadata and Pilot environment configuration, plus `ipFamilyPolicy: RequireDualStack`.

## Review Notes
- No additional technical issues were found in the Envoy listener, static cluster, or IPv6 health check examples after verifying them against the current Envoy v3 API references.
- Istio's current dual-stack documentation requires Istio 1.17 or later and Kubernetes 1.23 or later configured for dual-stack operation.
