# Validation Summary: How to Set Up Request Body Inspection in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- EnvoyFilter
- Envoy HTTP Lua filter
- Envoy HTTP buffer filter
- Istio WasmPlugin
- Proxy-Wasm Go SDK
- Envoy proxy diagnostics

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy buffer filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/buffer_filter
- Envoy buffer v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/buffer/v3/buffer.proto
- Proxy-Wasm Go SDK package documentation: https://pkg.go.dev/github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The Lua EnvoyFilter examples used the legacy filter name `envoy.lua`. Updated them to the current qualified extension name `envoy.filters.http.lua`, matching Envoy and Istio examples.
- The Lua examples used the deprecated `inline_code` field. Updated them to `default_source_code.inline_string`, which is the current non-deprecated Envoy Lua v3 configuration field.
- The request buffering section incorrectly implied that a separate buffer filter is required for Lua body inspection. Updated the wording to explain that Lua `body()` can suspend until the body is buffered, while the buffer filter is useful for enforcing a hard request-size limit before later filters run.
- The Proxy-Wasm Go example appended the whole buffered request body on every body callback and returned `ActionContinue` before the end of stream, which could allow body chunks upstream before final inspection. Updated the example to pause until `endOfStream`, inspect the complete body once, and use the current `github.com/proxy-wasm/proxy-wasm-go-sdk` import path.
- The “JSON Schema Validation” section only performed a basic JSON shape check, not schema validation. Renamed and reworded the section to “JSON Body Validation” and “basic JSON structure validation.”

## Review Notes
The EnvoyFilter API remains low-level and tied to Envoy/Istio internals, so these examples should be rechecked during Istio proxy upgrades. The JSON example is intentionally basic and does not replace full JSON parsing or schema validation in a dedicated Wasm plugin or external authorization service.
