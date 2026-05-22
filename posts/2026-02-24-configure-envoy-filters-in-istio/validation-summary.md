# Validation Summary: How to Configure Envoy Filters in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Envoy
- EnvoyFilter
- Kubernetes custom resources
- `istioctl`
- Envoy Lua, compressor, local rate limit, and HTTP connection manager filters

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `istioctl analyze` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Lua filter v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy HTTP connection manager v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy compressor filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/compressor_filter
- Envoy local rate limit filter v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto

## Issues Found
- The Lua EnvoyFilter examples used `inlineCode`, which maps to Envoy's deprecated `inline_code` field. Updated both examples to use the current `defaultSourceCode.inlineString` form shown by Istio's EnvoyFilter examples and Envoy's Lua v3 API.
- The namespace-scope pitfall stated that `istio-system` always applies mesh-wide. Updated it to say the mesh root namespace, often `istio-system`, applies mesh-wide because Istio's root namespace is configurable.

## Review Notes
The remaining EnvoyFilter match structures, patch operations, HTTP connection manager timeout fields, compressor filter configuration, local rate limit filter configuration, and `istioctl proxy-config` / `istioctl analyze` commands align with current official documentation. EnvoyFilter remains version-sensitive because patches reference Envoy internals, so examples should still be tested against the target Istio proxy version during upgrades.
