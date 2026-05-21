# Validation Summary: How to Modify Request Path with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway traffic management
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes kubectl
- istioctl proxy-config
- httpbin sample service

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Ingress Gateways task and httpbin sample: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter

## Issues Found
- The post said regex capture-group rewrites require EnvoyFilter. Current Istio VirtualService supports `rewrite.uriRegexRewrite` for regex-based URI rewrites with capture groups, so that guidance was corrected.
- The EnvoyFilter Lua examples used `inlineCode`. Istio's current EnvoyFilter examples use `defaultSourceCode.inlineString` for the Lua v3 filter configuration, so both snippets were updated.
- The query-parameter stripping Lua used a single `gsub` that could produce malformed paths such as `/path&foo=bar` when removing the first query parameter. It was replaced with logic that splits the path and query string, filters only the `debug` parameter, and rebuilds a valid `:path`.
- The testing example implied any httpbin path echoes the received URL. httpbin's `/anything` endpoint is the echo endpoint, so the example curl was changed to use `/anything/users/123`.
- The httpbin sample URL was pinned to Istio `release-1.20`. It was updated to `release-1.30`, which matches the current Istio documentation version reviewed.
- The `istioctl proxy-config routes` example used a Kubernetes shorthand resource name. It was updated to the documented `deployment/<deployment-name>.<namespace>` form.

## Review Notes
The remaining VirtualService examples use valid `networking.istio.io/v1` fields for URI prefix rewriting, authority rewriting, URI matching, redirects, and redirect status codes. The post uses short Kubernetes service names in examples; that can work, but Istio's documentation recommends fully qualified service names to avoid namespace ambiguity.
