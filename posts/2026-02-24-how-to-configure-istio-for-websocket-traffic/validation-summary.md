# Validation Summary: How to Configure Istio for WebSocket Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio Gateway
- Kubernetes Services
- Kubernetes Secrets
- Envoy WebSocket upgrades
- WebSocket protocol
- kubectl

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades.html
- Envoy timeout documentation: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- RFC 8441, Bootstrapping WebSockets with HTTP/2: https://www.rfc-editor.org/rfc/rfc8441
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The Istio examples used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for Gateway, VirtualService, and DestinationRule examples, so the snippets were updated to `v1`.
- The port naming section only mentioned port-name based protocol selection. Istio also supports Kubernetes `appProtocol`, and `appProtocol` takes precedence over the port name, so the text and Service example now include `appProtocol: http`.
- The idle timeout example set `connectionPool.http.idleTimeout`, which is an upstream HTTP connection pool idle timeout. For idle WebSocket connections, the TCP idle timeout is the more relevant DestinationRule setting, so the example now sets `connectionPool.tcp.idleTimeout`.
- The post said WebSocket upgrades only work over HTTP/1.1 and implied `h2UpgradePolicy: DO_NOT_UPGRADE` is always required. RFC 8441 and Envoy support WebSockets over HTTP/2 using extended CONNECT, so the wording now explains that `DO_NOT_UPGRADE` is useful when the backend expects the classic HTTP/1.1 `Upgrade: websocket` handshake.
- The retry example omitted retries on the WebSocket route but did not explicitly disable them. Istio documents a default retry policy when route retries are unspecified, so the WebSocket route now sets `attempts: 0`.
- The Envoy explanation described upgraded WebSocket traffic as purely TCP. Envoy documents upgraded traffic as an upgraded HTTP stream that can pass through the HTTP filter chain, so the wording now describes it as a long-lived upgraded stream with the upstream selected at handshake time.

## Review Notes
The TLS `credentialName` and `kubectl create secret tls` command align with Istio's secure ingress task and Kubernetes CLI documentation for the default Istio ingress gateway namespace. Environments using a custom gateway deployment namespace should create the TLS secret where that gateway expects to read credentials.
