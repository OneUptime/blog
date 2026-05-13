# Validation Summary: How to Configure Flagger for Canary Deployments with WebSocket Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes
- Istio
- Envoy
- WebSocket
- Prometheus
- kubectl

## Sources Consulted
- Flagger Istio progressive delivery documentation: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger canary service and metrics documentation: https://docs.flagger.app/usage/how-it-works and https://docs.flagger.app/main/usage/metrics
- Flagger FAQ on Istio routing and generated DestinationRules: https://docs.flagger.app/faq
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades.html
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The post said `timeout: 3600s` prevents Istio from terminating long-lived WebSocket connections. Istio HTTP route timeouts are disabled by default, and setting a finite timeout creates a cap rather than preventing termination. I removed the route timeout from the Canary example and changed the guidance to use Istio connection pool `idleTimeout` values appropriate for WebSocket sessions.
- The post recommended `h2UpgradePolicy: UPGRADE` as relevant for WebSocket connections. RFC 6455 WebSockets use an HTTP/1.1 upgrade handshake, while HTTP/2 WebSocket tunneling requires Extended CONNECT support. I changed the examples to `h2UpgradePolicy: DO_NOT_UPGRADE` and clarified when HTTP/2 WebSocket tunneling is relevant.
- The post implied users should configure or verify a standalone DestinationRule even though Flagger creates and reconciles Istio routing resources from the Canary `service` spec. I clarified that the traffic policy should be placed in the Canary resource when Flagger manages the rollout, and framed the DestinationRule example as only applicable when managing one separately.
- The DestinationRule example lacked idle timeout settings for long-lived idle connections. I added `idleTimeout: 0s` to the TCP and HTTP connection pool examples and explained the finite-timeout alternative.
- The `preStop` explanation said the hook gives active connections 15 seconds to close gracefully before termination. Kubernetes starts the termination grace countdown before running `preStop`, and the hook delays the TERM signal. I updated the text to explain that the application still needs SIGTERM handling and that `terminationGracePeriodSeconds` covers both hook execution and shutdown.

## Review Notes
The Prometheus metric names and Flagger MetricTemplate structure are valid. The active-connection query is a reasonable example, but in production it may need extra handling for counter resets and deployments with zero active connections during analysis.
