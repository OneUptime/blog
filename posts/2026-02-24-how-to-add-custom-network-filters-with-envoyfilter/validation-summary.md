# Validation Summary: How to Add Custom Network Filters with EnvoyFilter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy network filters
- Envoy TCP proxy
- Envoy local rate limit filter
- Envoy RBAC network filter
- Envoy Mongo proxy filter
- Kubernetes
- istioctl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy network local rate limit proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/local_ratelimit/v3/local_rate_limit.proto
- Envoy RBAC network filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/rbac_filter.html
- Envoy RBAC proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/rbac/v3/rbac.proto
- Envoy TCP proxy proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/tcp_proxy/v3/tcp_proxy.proto.html
- Envoy Mongo proxy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/mongo_proxy_filter
- Envoy SNI dynamic forward proxy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/sni_dynamic_forward_proxy_filter
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter

## Issues Found
- The RBAC example used `source_ip`, which Envoy marks as deprecated in the RBAC principal API. Changed it to `direct_remote_ip` to avoid using a deprecated field while preserving the intended CIDR-based downstream peer match.
- The SNI example inserted `envoy.filters.network.sni_dynamic_forward_proxy` by itself. Envoy's SNI dynamic forward proxy requires a matching dynamic forward proxy cluster and TCP proxy routing to that cluster, so the standalone EnvoyFilter would not work as described. Replaced the example with an SNI filter-chain match that inserts a local rate limit filter only for the matching SNI value.
- The performance section said Lua network filters exist but are rare. Envoy's documented Lua filter is an HTTP filter, not a normal built-in network filter. Reworded the guidance to refer to custom/native or Wasm network filters instead.

## Review Notes
EnvoyFilter remains an advanced Istio API and is sensitive to Envoy and Istio version changes. The examples use current v3 Envoy type URLs and Istio's documented `NETWORK_FILTER`, listener, filter chain, and patch operations. The `INSERT_BEFORE` examples still depend on generated filter names, which Istio documents as less stable than `ADD` plus `filterClass` where that insertion model applies.
