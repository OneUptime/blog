# Validation Summary: How to Remove Sensitive Headers with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio EnvoyFilter
- Envoy HTTP Lua filter
- HTTP headers
- curl
- nmap NSE http-headers script

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy router filter header documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy HTTP header sanitizing documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/header_sanitizing.html
- curl manual: https://curl.se/docs/manpage.html
- Nmap http-headers NSE script documentation: https://nmap.org/nsedoc/scripts/http-headers.html

## Issues Found
- The EnvoyFilter Lua examples used `inlineCode`. Envoy's current Lua v3 API marks the underlying `inline_code` field as deprecated and recommends `default_source_code`; the examples were updated to use `default_source_code` with `inline_string`.
- The "Global Header Removal with EnvoyFilter" section described the example as applying across all services in the mesh. The example matches `context: GATEWAY`, so the text was corrected to say it applies across ingress gateway routes.

## Review Notes
- The VirtualService `headers.request.remove` and `headers.response.remove` examples match Istio's current VirtualService header operations API.
- The `x-envoy-upstream-service-time` and `x-envoy-decorator-operation` discussion is consistent with Envoy's documented router/header behavior, but whether each header appears depends on the active Envoy/Istio route, tracing, and response configuration.
- Removing `x-forwarded-for`, `x-request-id`, or trace headers can be valid for strict boundary hardening, but production users should confirm they do not rely on those headers for client IP attribution, request correlation, tracing, or logging.
