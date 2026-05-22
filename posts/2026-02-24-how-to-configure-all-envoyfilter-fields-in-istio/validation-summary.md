# Validation Summary: How to Configure All EnvoyFilter Fields in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy Proxy
- Kubernetes custom resources
- Gateway API targeting
- istioctl proxy-config
- Envoy HTTP Lua filter
- Envoy HTTP connection manager

## Sources Consulted
- Istio EnvoyFilter API reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy HTTP Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy HTTP connection manager v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy HeaderValueOption API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto
- Envoy route configuration v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route.proto.html

## Issues Found
- The top-level EnvoyFilter example set both `workloadSelector` and `targetRefs`, which Istio documents as mutually exclusive. Removed `targetRefs` from that example because the post already has a separate `targetRefs` example.
- The `targetRefs` explanation described it only as targeting Kubernetes Gateway API resources. Updated the text to include the currently documented supported target kinds: Gateway, GatewayClass, Service for waypoints, and ServiceEntry.
- The `priority` explanation omitted same-priority ordering. Added that same-priority patch sets are ordered by creation time and fully qualified resource name.
- The `BOOTSTRAP` `applyTo` entry described it as rarely used, but Istio marks it deprecated. Updated the description.
- The listener match example used `applicationProtocols` as a YAML list. Istio documents this field as a comma-separated string, so the example now uses `h2,http/1.1`.
- Lua examples used deprecated Envoy `inline_code`. Replaced it with `default_source_code.inline_string`, which is the current Envoy v3 field.
- The Lua header example passed `os.clock()` directly to `headers():add`. Converted it to `tostring(os.clock())` so the header value is a string.
- The response header example used deprecated `append: false`. Replaced it with `append_action: OVERWRITE_IF_EXISTS_OR_ADD`.
- The timeout example was labeled as a listener timeout while it patches the HTTP connection manager network filter. Renamed the heading and resource name to match the actual Envoy object being modified.

## Review Notes
The post is technically useful but still intentionally high-level. Future improvements could mention `filterClass` as the preferred insertion mechanism for some `ADD` HTTP filter cases, and note that EnvoyFilter patches are sensitive to Istio and Envoy version changes even when the EnvoyFilter API itself remains backward compatible.
