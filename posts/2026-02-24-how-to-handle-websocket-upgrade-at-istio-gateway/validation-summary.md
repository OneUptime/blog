# Validation Summary: How to Handle WebSocket Upgrade at Istio Gateway

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy HTTP upgrades and timeouts
- WebSocket / RFC 6455
- Socket.IO sticky sessions
- Kubernetes pod lifecycle hooks
- Prometheus / PromQL
- wscat and curl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Socket.IO multiple nodes / sticky load balancing: https://socket.io/docs/v4/using-multiple-nodes/
- Socket.IO server options: https://socket.io/docs/v4/server-options/
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- wscat npm package documentation: https://www.npmjs.com/package/wscat

## Issues Found
- The timeout section implied `timeout: 0s` was generally needed to increase the VirtualService timeout. Istio documents the HTTP route timeout as disabled by default, so the text now says this is only needed when a route timeout has been configured.
- The timeout section said to disable the stream idle timeout while the EnvoyFilter example set it to `3600s`. The wording now correctly says to increase the stream idle timeout.
- The sidecar timeout section implied all sidecars always need the same EnvoyFilter. The text now scopes this to cases where idle connections are still being closed by the sidecar.
- The `LEAST_REQUEST` explanation said it routes to the pod with the fewest active connections. Istio documents it as favoring endpoints with the fewest outstanding requests, so the explanation was corrected while preserving the WebSocket-specific guidance.
- The `maxRequestsPerConnection` explanation said each WebSocket connection handles many requests. A WebSocket is one upgraded HTTP request/stream that carries WebSocket messages, so the explanation now uses that terminology.
- The Socket.IO sticky session section said Socket.IO sets the `io` cookie and that `ttl: 0s` never expires. Socket.IO v3 and later do not send a cookie by default, and Istio documents `ttl: 0s` as a generated session cookie. The text was corrected.
- The curl example reused the RFC sample `Sec-WebSocket-Key`. RFC 6455 requires a base64-encoded 16-byte value for the key, so the command now generates one with `openssl rand -base64 16` and explicitly uses HTTP/1.1.

## Review Notes
The configuration examples use Istio `networking.istio.io/v1beta1` for Gateway, VirtualService, and DestinationRule even though the current Istio docs primarily show `networking.istio.io/v1`. The `v1beta1` examples are still commonly served by Istio installations, but a future cleanup could update the snippets to `v1` for consistency with current documentation.
