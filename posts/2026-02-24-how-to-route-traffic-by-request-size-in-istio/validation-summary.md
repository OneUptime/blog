# Validation Summary: How to Route Traffic by Request Size in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes Deployments
- kubectl
- HTTP Content-Length and chunked transfer encoding

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio Envoy statistics configuration: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- RFC 9110, HTTP Semantics, Content-Length: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9112, HTTP/1.1, Transfer-Encoding and chunked coding: https://www.rfc-editor.org/rfc/rfc9112

## Issues Found
- The DestinationRule defined only `standard` and `large-payload`, but later VirtualService examples route to `medium-payload`. Added a `medium-payload` subset so the examples are internally consistent.
- The Content-Length regex was unanchored. Changed it from `[0-9]{7,}` to `^[0-9]{7,}$` so the header value itself must be a 7-or-more digit decimal value.
- The Lua filter used `headers():add()` for `x-size-class`, which could produce duplicate values if the header was already present. Changed it to `headers():replace()` and added `request_handle:clearRouteCache()` after modifying a route-affecting header, following Envoy Lua guidance.
- The large-payload backend section said the `proxy.istio.io/config` annotation adjusted proxy buffer limits, but the shown `proxyStatsMatcher` configuration only changes Envoy proxy statistics collection. Updated the wording to describe statistics collection accurately.
- The testing command forged a large `Content-Length` header without sending a matching request body, which can create an invalid or hanging HTTP request. Replaced it with a command that writes a 15 MiB file in the test pod and uploads it with `curl --data-binary`, allowing curl to set the correct Content-Length.

## Review Notes
The approaches are technically valid for requests where the size is known from Content-Length before routing. They do not classify requests sent with chunked transfer encoding unless another gateway or client component supplies a trusted size-class header. EnvoyFilter remains version-sensitive because it embeds Envoy API configuration, so it should be tested during Istio upgrades.
