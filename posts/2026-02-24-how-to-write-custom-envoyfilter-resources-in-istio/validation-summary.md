# Validation Summary: How to Write Custom EnvoyFilter Resources in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy proxy
- Kubernetes
- istioctl
- Envoy Lua HTTP filter
- Envoy HTTP connection manager
- Envoy access logging

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy access log API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/accesslog/v3/accesslog.proto

## Issues Found
- VirtualService already supports basic request and response header manipulation, so the use-case wording was changed from "Adding custom HTTP headers that VirtualService does not support" to "Adding custom HTTP header logic that VirtualService header manipulation does not support."
- The Lua example used the deprecated `inlineCode` field. Updated it to `defaultSourceCode.inlineString`, which is the current Envoy Lua filter configuration field.
- The timeout example was titled as a listener connection timeout, but the fields shown configure HTTP connection manager idle timeouts. Updated the heading to "Setting HTTP Idle Timeouts."
- The scoping guidance treated `istio-system` as always being the mesh-wide root. Updated it to refer to the Istio config root namespace, which is typically `istio-system`.
- The debugging `grep -l` command only printed the filename when a match existed. Updated it to `grep -n` so it actually shows matching lines.
- The `@type` warning said an invalid type is silently ignored. Updated it to say the patch can be rejected or fail to apply, which better reflects Envoy/Istio behavior.
- The patch ordering description was incorrect. Updated it to describe root namespace ordering first, then priority, creation timestamp, and fully qualified resource name.

## Review Notes
The remaining examples use valid Istio EnvoyFilter structure and current Envoy v3 type URLs. The post intentionally stays version-neutral; future maintenance should re-check EnvoyFilter examples during Istio upgrades because EnvoyFilter depends on Envoy internal APIs.
