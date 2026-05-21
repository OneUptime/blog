# Validation Summary: How to Handle Large File Uploads Through Istio Proxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- EnvoyFilter
- VirtualService
- DestinationRule
- HTTP file uploads
- kubectl
- curl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio request timeouts task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy buffer filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/buffer_filter
- Envoy buffer filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/buffer/v3/buffer.proto

## Issues Found
- The introduction said Istio sidecars have default request body size and buffer limits that are inadequate for large uploads. Envoy streams proxied request bodies by default, so I changed this to focus on timeouts, idle timeouts, header limits, and filters that explicitly buffer request bodies.
- The header-size EnvoyFilter set `max_request_headers_kb: 60`, which matches Envoy's documented default rather than increasing it. I changed the example to `96` and clarified that this controls HTTP request headers, not multipart body fields.
- The timeout section described a default Istio timeout of 15 seconds. Istio's VirtualService request timeout is documented as disabled by default; Envoy's native route timeout defaults to 15 seconds if not overridden. I corrected the explanation.
- The DestinationRule explanation implied `maxRequestsPerConnection` would close a connection during an active upload. Istio documents `0` as the default unlimited value, so I changed the wording to describe connection drains between uploads when the value has been changed elsewhere.
- The upload test generated `/tmp/testfile` on the local machine and then tried to upload it from inside `<client-pod>`, where the file would not exist. I changed the command to generate the file inside the client pod before running `curl`.

## Review Notes
The EnvoyFilter examples use Istio's low-level extension API, which is powerful but version-sensitive. Teams should verify generated Envoy config with `istioctl proxy-config` or Envoy admin output after applying these filters in their own Istio version.
