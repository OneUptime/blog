# Validation Summary: How to Transform Request Headers with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy HTTP header manipulation
- Envoy Lua HTTP filter
- Kubernetes kubectl
- istioctl proxy-config

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Istio sample manifests in the official Istio repository: https://github.com/istio/istio/tree/release-1.29/samples

## Issues Found
- The dynamic header section described Envoy command operators as proxy metadata and implied only a small fixed set was supported. Updated the wording to describe Envoy substitution formatters and clarify that request-time context determines which values are useful.
- The dynamic header example used `x-envoy-downstream-service-cluster` for a remote address value, which conflicts with the normal meaning of that Envoy header. Changed it to `x-client-address`.
- The EnvoyFilter Lua example used the deprecated `inlineCode` field. Updated it to `defaultSourceCode.inlineString`, matching the current Envoy Lua v3 API and Istio EnvoyFilter examples.
- The Lua example passed `os.time()` directly as a header value. Wrapped it with `tostring(...)` so the header value is a string.
- The EnvoyFilter scope explanation implied the filter applied only inside an `istio-system` scope. Clarified that an EnvoyFilter in the Istio root namespace applies mesh-wide unless narrowed by a workload selector.
- The gateway request-header removal example removed `x-powered-by` and `server`, which are normally response headers. Replaced them with request-oriented example headers.
- The verification commands deployed only `httpbin` but then executed curl from a `sleep` deployment that was never created. Added the official curl sample manifest and changed the exec command to `deployment/curl`.
- The sample manifest URL used the older Istio `release-1.20` branch. Updated it to `release-1.29`, matching the current Istio documentation version consulted during review.
- The `istioctl proxy-config routes` example used `deploy/my-service`. Updated it to the documented `deployment/my-service` selector form.
- The gotcha about case-insensitive headers was scoped to HTTP/2 only. Updated it to note that header names are generally case-insensitive and HTTP/2 requires lowercase names.

## Review Notes
The remaining examples use valid Istio networking API fields for VirtualService header `set`, `add`, and `remove` operations. The post still intentionally uses VirtualService rather than Kubernetes Gateway API HTTPRoute filters; that is technically valid for Istio, but a future post could mention Gateway API as an alternative for ingress-focused header modification.
