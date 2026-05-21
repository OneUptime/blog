# Validation Summary: How to Configure VirtualService for WebSocket Connections

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- Envoy WebSocket upgrades
- Kubernetes
- WebSocket protocol

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio request timeout task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio v1 API announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades.html
- Envoy timeout documentation: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- RFC 6455 WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- AWS Load Balancer Controller annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/

## Issues Found
- The post said Istio applies a 15-second HTTP route timeout by default. Current Istio documentation says HTTP request timeouts are disabled by default, although Envoy's native route timeout defaults to 15 seconds. Updated the timeout explanation, troubleshooting note, and watch-out item to describe configured route timeouts accurately.
- The examples used `networking.istio.io/v1beta1`. Istio promoted VirtualService, Gateway, and DestinationRule to `networking.istio.io/v1` in Istio 1.22 and encourages users to transition to v1. Updated the snippets to use the current stable API version.
- The session stickiness section implied all WebSocket services require reconnects to the same backend pod. Updated it to apply only when the backend keeps session state in memory.
- The HTTP/2 explanation said WebSocket upgrades do not happen over HTTP/2. Updated it to explain that the classic Upgrade handshake is HTTP/1.1, while Envoy can tunnel WebSockets over HTTP/2 with additional configuration.
- The idle timeout section actually configured TCP keepalive, not an idle timeout. Updated the heading and explanation to describe TCP keepalive accurately.
- The introductory WebSocket handshake snippet omitted required RFC 6455 headers. Added `Host`, `Sec-WebSocket-Key`, and `Sec-WebSocket-Version`.
- The debug `curl` command omitted required WebSocket handshake headers. Added `Sec-WebSocket-Key`, `Sec-WebSocket-Version`, and `--http1.1`.
- The debug stats command checked the general connection metric. Updated it to check Envoy's WebSocket/upgrade active connection metric.

## Review Notes
The configuration examples are syntactically valid Istio networking resources. Future improvements could mention that WebSocket traffic may also be affected by Envoy stream idle timeout and by external load balancer idle timeout settings, depending on the deployment.
