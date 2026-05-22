# Validation Summary: How to Add Custom Headers at Gateway Level in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio EnvoyFilter
- Envoy HTTP Lua filter
- Kubernetes kubectl
- istioctl proxy-config
- HTTP security and correlation headers

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- MDN Strict-Transport-Security reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security

## Issues Found
- The EnvoyFilter option was described as the "cleanest" approach without noting that EnvoyFilter is a low-level, upgrade-sensitive API. Updated the wording to describe it as the most direct gateway-wide approach while warning that it depends on Envoy configuration details.
- The Lua example passed `os.time()` directly to `headers():add()`. Envoy's Lua header API documents the header value as a string, so the example now uses `tostring(os.time())`.
- The post implied HSTS generally forces HTTPS without the HTTPS-only caveat. Added a note that browsers ignore `Strict-Transport-Security` sent over plain HTTP and adjusted the summary table to describe future HTTPS enforcement more accurately.
- The summary table described `x-request-id` as distributed tracing. Adjusted it to request correlation, which is more accurate for that header.

## Review Notes
The Istio Gateway, VirtualService header manipulation, EnvoyFilter insertion pattern, kubectl JSONPath command, curl examples, and `istioctl proxy-config routes` command are technically consistent with current official documentation. EnvoyFilter remains powerful but should be tested carefully across Istio proxy upgrades.
