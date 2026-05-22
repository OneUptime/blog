# Validation Summary: How to Configure CORS Headers with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio EnvoyFilter
- Envoy CORS filter behavior
- Envoy Lua HTTP filter
- Kubernetes kubectl logs
- Browser CORS

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Access-Control-Allow-Origin reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The CORS overview implied every cross-origin browser request sends a preflight OPTIONS request. Updated it to clarify that only some requests are preflighted, while simple requests still require CORS headers on the actual response.
- The wildcard-origin guidance treated Istio's `regex: ".*"` as equivalent to returning a literal `Access-Control-Allow-Origin: *`. Updated it to reflect Istio's documented behavior: when an allowed origin matches, Envoy sets `Access-Control-Allow-Origin` to the client-provided origin. The warning now distinguishes literal wildcard responses from broad origin reflection and recommends explicit origins for credentialed requests.
- The preflight logging command checked the workload sidecar for a VirtualService attached to a gateway. Updated it to check the ingress gateway proxy logs, which is where gateway-level CORS handling occurs.
- The preflight handling text said preflight requests never reach the backend service. Updated it to "matching" and "allowed" preflight requests because Istio's `unmatchedPreflights` default is to forward unmatched preflights upstream.
- The EnvoyFilter Lua example used the old inline Lua field form and attempted to read the request `Origin` header from response headers. Updated it to use current Envoy `default_source_code.inline_string` syntax and store the request origin in dynamic metadata so the response path can add CORS headers correctly.

## Review Notes
- The VirtualService `corsPolicy` fields used in the post are current in Istio 1.30 documentation.
- The regex examples are technically valid RE2-style matches, but production configurations should keep origin patterns as narrow as possible.
