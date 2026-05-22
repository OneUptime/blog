# Validation Summary: How to Add Custom Response Headers with EnvoyFilter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Istio VirtualService
- Envoy HTTP Lua filter
- Envoy route configuration header mutations
- Kubernetes kubectl exec
- HTTP response headers

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy route configuration v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route.proto.html
- Envoy route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy common HeaderValueOption API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto.html
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/

## Issues Found
- The Lua examples used `inline_code`, which Envoy documents as deprecated. Replaced it with `default_source_code.inline_string` in all Lua EnvoyFilter examples.
- The conditional response-status example compared the `:status` header as a string. Changed it to `tonumber(...)` and compared numeric status codes so the example is correct and robust.
- The VirtualService explanation implied response header manipulation is generally unreliable. Updated it to match Istio's documentation: VirtualService supports request and response header manipulation during routing, while EnvoyFilter is appropriate for lower-level sidecar or gateway patches and logic VirtualService cannot express.

## Review Notes
- The static `ROUTE_CONFIGURATION` example uses fields documented by Envoy: `response_headers_to_add`, `response_headers_to_remove`, and `append_action: OVERWRITE_IF_EXISTS_OR_ADD`.
- `X-XSS-Protection` is obsolete in modern browsers, but it is still syntactically valid as a response header. Consider replacing it in a future content pass if the post is intended as current security-header guidance rather than an EnvoyFilter mechanics tutorial.
