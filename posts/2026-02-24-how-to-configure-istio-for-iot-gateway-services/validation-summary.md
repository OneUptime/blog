# Validation Summary: How to Configure Istio for IoT Gateway Services

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio ingress gateway
- Kubernetes Services and kubectl
- MQTT, MQTT over TLS, HTTP APIs, and CoAP

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio debugging Envoy and Istiod documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The MQTT over TLS VirtualService route used a `tcp` route for port 8883 even though the Gateway server was configured as `protocol: TLS` with `PASSTHROUGH`. Changed port 8883 routing to a `tls` route with `sniHosts`, matching Istio's TLS passthrough routing model.
- The ingress gateway Service example exposed CoAP/UDP through the Istio ingress gateway. Istio documents that non-TCP protocols such as UDP are not proxied and cannot be used in proxy-only components such as ingress or egress gateways. Removed the UDP port from the IstioOperator example and clarified that CoAP should be exposed outside the Istio gateway path.
- The rate limiting section described DestinationRule connection pools as incoming per-device rate limiting. Updated the section to describe connection pools as upstream connection/request circuit-breaking controls and noted that per-device rate limiting belongs in application code or an Envoy rate limit integration.
- The PeerAuthentication example implied that gateway PERMISSIVE mode is required for one-way external TLS. Removed the gateway PeerAuthentication policy and clarified that Gateway TLS settings control external device-to-gateway TLS, while PeerAuthentication controls workload mTLS inside the mesh.
- The long-lived connection section said a 3600-second idle timeout prevents Istio from closing connections after a few minutes, but Istio's default TCP idle timeout is already 1 hour. Changed the example to 7200 seconds and updated the explanation.
- The monitoring commands used `pilot-agent request GET /stats`; Istio's Envoy statistics documentation uses `pilot-agent request GET stats`. Updated both commands.

## Review Notes
The examples are now technically consistent with current Istio v1 APIs. The post still uses short Kubernetes service names such as `mqtt-broker` and `telemetry-ingester`; Istio supports this, but fully qualified service names are safer in multi-namespace examples.
