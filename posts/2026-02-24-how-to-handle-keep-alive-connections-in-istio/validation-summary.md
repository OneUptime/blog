# Validation Summary: How to Handle Keep-Alive Connections in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio DestinationRule
- IstioOperator MeshConfig
- Istio EnvoyFilter
- Envoy HTTP connection manager and connection pools
- TCP keepalive
- HTTP/1.1 persistent connections
- Kubernetes kubectl exec
- AWS Application Load Balancer idle timeout

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Envoy statistics guide: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy connection pooling overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/connection_pooling.html
- AWS Application Load Balancer attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- AWS Application Load Balancer troubleshooting: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html
- RFC 9112, HTTP/1.1: https://www.rfc-editor.org/rfc/rfc9112.html
- RFC 9293, Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293.html

## Issues Found
- The HTTP keep-alive explanation said the `Connection: keep-alive` header tells an HTTP/1.1 server not to close the connection. Updated this to clarify that HTTP/1.1 persistence is the default, `Connection: close` opts out, and `Connection: keep-alive` is mainly HTTP/1.0 compatibility.
- The `maxRequestsPerConnection` explanation said Envoy closes the connection immediately after the limit. Updated this to "drains the connection" to match Envoy's behavior for HTTP/2 connection pools.
- The mesh-level example used `ISTIO_META_IDLE_TIMEOUT` proxy metadata to configure an idle timeout. Removed that unsupported setting and narrowed the section to supported mesh-level `tcpKeepalive` configuration.
- The EnvoyFilter example used lower-camel-case fields (`typedConfig`, `commonHttpProtocolOptions`, `idleTimeout`). Updated the snippet to the snake_case field names used in Istio's official EnvoyFilter examples.
- The load balancer guidance conflicted with the AWS ALB recommendation. Updated the target-side timeout guidance so Envoy's idle timeout is higher than the ALB idle timeout, avoiding ALB reuse of a target connection that Envoy has already closed.

## Review Notes
The post is technically relevant and the remaining examples use current Istio APIs. EnvoyFilter remains version-sensitive by nature, so future Istio upgrades should re-check that gateway patch against the target proxy version.
