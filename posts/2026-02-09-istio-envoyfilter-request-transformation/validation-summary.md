# Validation Summary: How to Build a Custom Istio EnvoyFilter for Request Body Transformation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP Lua filter
- Envoy Lua stream handle, header, body, metadata, and buffer APIs
- Kubernetes kubectl
- HTTP request body transformation

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto.html
- Envoy gRPC-JSON transcoder documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_json_transcoder_filter
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Envoy Lua filter examples used the older `envoy.lua` filter name and deprecated `inline_code` field. Updated examples to use `envoy.filters.http.lua` and `default_source_code.inline_string`, matching current Envoy Lua v3 documentation.
- The header example added `x-request-id` with a possibly nil value. Changed it to conditionally add `x-original-request-id` only when the request ID header exists.
- The JSON examples assumed a built-in `json` Lua module. Envoy documents LuaJIT support and its stream APIs, but not a bundled JSON module, so the examples now state that a JSON module must be supplied in the proxy runtime or via a mounted Lua file.
- The protocol adaptation example claimed to convert REST to gRPC by setting `application/grpc` and writing JSON. That is not a valid gRPC request body. Replaced it with a REST-to-JSON-RPC-style transformation and noted Envoy's dedicated gRPC-JSON transcoder in the review sources.
- The authentication example used `request_handle:metadata()` for dynamic metadata. Updated it to use `request_handle:streamInfo():dynamicMetadata()`, which is the documented dynamic metadata API.
- The external Lua modules section described loading ConfigMap data with `require()` through `source_codes`. Envoy documents `source_codes` as named Lua sources for LuaPerRoute selection, so the section now shows named source code selected with `LuaPerRoute`.
- The article stated that EnvoyFilter with Lua is often the only option for request body transformation. Softened this to avoid excluding other proxy extension mechanisms.

## Review Notes
The fenced YAML examples were parsed successfully with PyYAML. A local Lua or LuaJIT runtime was not installed in the workspace, so embedded Lua syntax was reviewed against Envoy's documented Lua API rather than compile-checked locally.
