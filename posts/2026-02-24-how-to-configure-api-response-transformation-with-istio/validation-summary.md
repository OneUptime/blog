# Validation Summary: How to Configure API Response Transformation with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- EnvoyFilter
- Envoy Lua HTTP filter
- Istio VirtualService header operations
- Envoy Wasm HTTP filters
- Kubernetes kubectl logs
- istioctl proxy-config

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy-config diagnostic tools: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Wasm runtime documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Envoy Wasm HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/wasm_filter.html
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/

## Issues Found
- The VirtualService example used an invalid API version, `networking.istio.io/v1networking`. Changed it to the current valid `networking.istio.io/v1`.
- The selective transformation example tried to read `:path` from response headers inside `envoy_on_response`. `:path` is a request pseudo-header, not a response header. Updated the example to record the request path in Envoy dynamic metadata during `envoy_on_request` and read it back during `envoy_on_response`.
- The "Targeting Specific Routes" section described route-level matching, but the example was path-based Lua logic. Renamed the section and adjusted the surrounding sentence to accurately describe request path targeting.

## Review Notes
- The EnvoyFilter and Lua APIs used in the examples are valid, but EnvoyFilter patches depend on Envoy internals and should be regression-tested when upgrading Istio proxy versions.
- For new Istio deployments, WasmPlugin is generally the higher-level Istio API to consider for Wasm extensions, although the EnvoyFilter Wasm example remains technically valid.
