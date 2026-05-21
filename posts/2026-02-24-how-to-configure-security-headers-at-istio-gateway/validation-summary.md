# Validation Summary: How to Configure Security Headers at Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Istio VirtualService
- Envoy HTTP Lua filter
- Envoy route response header manipulation
- HTTP security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection
- Kubernetes kubectl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference, including response header operations: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy route configuration API, including `response_headers_to_add` and `response_headers_to_remove`: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy core `HeaderValueOption` API, including `append_action`: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto.html
- MDN `X-XSS-Protection` header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN `Content-Security-Policy` header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN `Content-Security-Policy-Report-Only` header documentation: https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only
- MDN `Strict-Transport-Security` header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post recommended `X-XSS-Protection: 1; mode=block`. This header is deprecated and MDN warns that enabling legacy XSS filtering can introduce vulnerabilities in otherwise safe pages. Updated the examples to use `X-XSS-Protection: 0` and clarified that the header disables legacy browser XSS filtering.
- The conditional CSP Lua example attempted to read the request `:authority` pseudo-header from `response_handle:headers()`. In Envoy Lua, the response callback sees response headers; request values needed later should be saved during `envoy_on_request`. Added an `envoy_on_request` callback that stores `:authority` in dynamic metadata, then reads it in `envoy_on_response`.
- The CSP report-only example used only `report-uri`. MDN documents `report-to` with `Reporting-Endpoints` as the modern reporting mechanism, while `report-uri` is deprecated but still useful for compatibility. Added a matching `Reporting-Endpoints` header and included `report-to` alongside `report-uri`.

## Review Notes
- The EnvoyFilter examples use `networking.istio.io/v1alpha3`, which remains the documented API version for EnvoyFilter.
- The `VirtualService` example uses `networking.istio.io/v1` and valid response header operations.
- The `response_headers_to_add`, `response_headers_to_remove`, and `append_action: OVERWRITE_IF_EXISTS_OR_ADD` fields align with Envoy route configuration APIs.
- HSTS with `preload` is syntactically valid, but production use should only happen after confirming the domain satisfies preload requirements and all subdomains can serve HTTPS.
