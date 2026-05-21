# Validation Summary: How to Handle Authorization for Streaming Protocols in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio VirtualService
- Istio DestinationRule
- Envoy proxy admin API
- Kubernetes kubectl
- gRPC over HTTP/2
- WebSocket
- Server-Sent Events
- JWT authorization
- Prometheus/Istio metrics

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio Authorization Policy Normalization reference: https://istio.io/latest/docs/reference/config/security/normalization/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy admin interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy route configuration reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- gRPC over HTTP/2 protocol reference: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- RFC 6455 WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- WHATWG HTML Server-Sent Events specification: https://html.spec.whatwg.org/multipage/server-sent-events.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `notValues: [""]` to require the `x-api-key` gRPC metadata header. Istio documents `*` as the presence match for string fields, so this was changed to `values: ["*"]`.
- The examples used source principals and namespaces without noting that these attributes require mutual TLS. Added a short note that the source identity matches rely on Istio workload identity and require mTLS between workloads.
- The streaming `VirtualService` example routed `/events/` to `event-service` but only listed `ws-service` in `spec.hosts`. Added `event-service` to the host list so the rule can apply to that service host.
- The post described using a `DestinationRule` HTTP connection pool `idleTimeout` as the gRPC stream timeout. Istio documents this as an idle connection pool timeout, not a cap on an active RPC stream. Replaced that guidance with a `VirtualService` route timeout for server-streaming gRPC calls, and added a caveat that client-streaming and bidirectional streams should use application-level deadlines and reconnection logic.

## Review Notes
The remaining examples are version-current for Istio `security.istio.io/v1` and `networking.istio.io/v1`. WebSocket and SSE authorization is still limited to the initial HTTP request or upgrade handshake; per-message authorization has to be implemented at the application layer or with an external authorization design that can inspect the relevant traffic.
