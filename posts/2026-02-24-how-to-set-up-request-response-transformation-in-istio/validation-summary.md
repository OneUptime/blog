# Validation Summary: How to Set Up Request/Response Transformation in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio EnvoyFilter
- Envoy HTTP header manipulation
- Envoy Lua HTTP filter
- Kubernetes manifests
- istioctl and kubectl debugging commands

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://preliminary.istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy substitution formatter command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter

## Issues Found
- The VirtualService example used `networking.istio.io/v1beta1`. I changed it to the current stable `networking.istio.io/v1` API version used by the current Istio VirtualService reference.
- The Lua request body example modified the request body without updating `content-length`. I added a `content-length` replacement after `setBytes`, matching the post's own guidance and HTTP body handling requirements.
- The Lua body-access notes said `request_handle:body()` returns nil when the body is not buffered and suggested a separate buffer filter may be needed. Envoy's Lua `body()` API suspends execution until the full body is buffered, subject to connection-manager limits. I updated the notes to reflect that behavior.

## Review Notes
The EnvoyFilter API remains `networking.istio.io/v1alpha3` in the current Istio reference. Envoy supports dynamic header values using substitution formatters such as `%REQ(...)%`, `%RESP(...)%`, `%DOWNSTREAM_REMOTE_ADDRESS%`, `%START_TIME%`, and `%PROTOCOL%`, with the caveat that values depending on unavailable request or response context may render empty in custom headers.
