# Validation Summary: How to Transform Response Headers with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio EnvoyFilter
- Envoy HTTP Lua filter
- Kubernetes kubectl
- curl
- HTTP response headers and security headers

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy HTTP filter chain overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_filters.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The EnvoyFilter examples used the deprecated Lua `inlineCode` field. Updated all Lua filter examples to use `defaultSourceCode.inlineString`, which is the current field shown in Istio and Envoy documentation.
- The staging debug example attempted to add `response_handle:streamInfo():dynamicMetadata():get("envoy.lua")` directly as a response header value. Envoy dynamic metadata `get()` returns a table for a filter namespace, not a response-time string. Replaced that header with `x-envoy-route` using `response_handle:streamInfo():routeName()`, which returns a string suitable for a header value.
- The final note claimed EnvoyFilter response transformations always run before VirtualService transformations and that the last write wins. That ordering is too absolute because response filter execution depends on the generated Envoy route configuration and HTTP filter insertion point. Reworded the note to recommend avoiding conflicting mutations unless the generated behavior has been tested.

## Review Notes
The VirtualService header operation examples, `kubectl exec` syntax, `istioctl proxy-config routes` usage, and curl verification commands are consistent with the referenced documentation. The local workspace did not have `istioctl` or `kubectl` installed, so those commands were verified against official command references rather than local help output.
