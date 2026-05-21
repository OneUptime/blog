# Validation Summary: How to Configure WAF-Like Protection with Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Kubernetes
- EnvoyFilter
- Envoy Lua HTTP filter
- Envoy external authorization
- Istio AuthorizationPolicy
- Envoy buffer HTTP filter
- Web Application Firewall concepts
- OWASP Core Rule Set

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio MeshConfig extensionProviders reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Envoy stats documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy external authorization HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter.html
- Envoy buffer HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/buffer_filter
- Envoy buffer v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/buffer/v3/buffer.proto
- Coraza Proxy-Wasm project documentation: https://github.com/corazawaf/coraza-proxy-wasm

## Issues Found
- The external authorization example used `ghcr.io/corazawaf/coraza-proxy-wasm:latest` as a standalone Kubernetes service behind Istio `CUSTOM` authorization. Coraza Proxy-Wasm is documented as a Proxy-Wasm filter loaded into Envoy/Istio, not as an Envoy ext_authz gRPC service. I changed the example to a generic `your-registry/waf-ext-authz:latest` service and clarified that the service must implement Envoy's ext_authz check API while wrapping Coraza, ModSecurity, or another WAF engine.
- The ext_authz mesh config did not include request body forwarding. A WAF engine needs body data to inspect many payload-based attacks. I added `includeRequestBodyInCheck` with `maxRequestBytes` and `allowPartialMessage`, matching the current Istio MeshConfig extension provider fields.
- The monitoring section said Lua custom stats could be added with `request_handle:streamInfo()` methods. Envoy Lua exposes stats through `handle:stats()`, with counters, gauges, and histograms documented under the Lua stats scope API. I changed the text to reference `request_handle:stats()`.

## Review Notes
The snippets are accurate for current Istio and Envoy APIs, but EnvoyFilter remains a low-level API that can be fragile across Istio upgrades. Istio 1.30 introduces TrafficExtension for Lua and Wasm extensions, so future versions of this post could mention that newer API as an alternative once it is broadly adopted.
