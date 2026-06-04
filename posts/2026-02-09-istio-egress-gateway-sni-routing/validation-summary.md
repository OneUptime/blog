# Validation Summary: How to Configure Istio Egress Gateway with SNI Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio Egress Gateway
- Istio ServiceEntry, Gateway, VirtualService, DestinationRule, AuthorizationPolicy, and EnvoyFilter resources
- Kubernetes
- TLS SNI routing
- Prometheus metrics
- Envoy local rate limiting

## Sources Consulted
- Istio Egress Gateways task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio rate limit task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy network local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/local_rate_limit_filter

## Issues Found
- The single-host example used `api.external-service.com`, which is a placeholder and would not be testable as written. Changed it to `api.github.com` throughout the single-host configuration and test commands.
- The passthrough HTTPS examples used `protocol: HTTPS` and `name: https`. Istio's official egress gateway passthrough example uses `protocol: TLS` on port 443 because the gateway is routing opaque TLS by SNI without terminating HTTP. Updated the ServiceEntry and Gateway snippets accordingly.
- The Istio resource snippets used older `networking.istio.io/v1beta1` and `security.istio.io/v1beta1` API versions. Updated current stable Istio API examples to `networking.istio.io/v1` and `security.istio.io/v1`.
- The single-host VirtualService omitted the DestinationRule subset used by Istio's official egress gateway example for routing traffic to the gateway service. Added the DestinationRule and referenced the subset in the sidecar-to-gateway route.
- The multiple-host VirtualService incorrectly used weighted destinations from one gateway SNI match, which would load balance one TLS connection across unrelated external services. Split the gateway-to-external routing into separate SNI match rules, one per external host.
- The AuthorizationPolicy matched `operation.hosts`, which is HTTP-only and not appropriate for opaque TLS passthrough traffic. Changed it to match port `443` and clarified that ServiceEntry and VirtualService SNI rules control the allowed external hostnames.
- The monitoring examples used HTTP request metrics (`istio_requests_total` and request duration histograms), but passthrough TLS is reported as TCP traffic. Replaced them with TCP connection and byte metrics.
- The rate-limit EnvoyFilter inserted an HTTP local rate-limit filter into an HTTP connection manager, which does not apply to passthrough TLS routed by a TCP proxy. Replaced it with an Envoy network local rate-limit filter and clarified that it limits new connections, not individual HTTP requests.
- The sample prerequisites did not ensure that the client pod receives an Istio sidecar. Added a namespace sidecar injection command before deploying the sample client.

## Review Notes
The corrected post focuses on application-originated TLS routed through an egress gateway without TLS termination. Future improvements could add a separate TLS origination variant for teams that need HTTP-level authorization, telemetry, and request rate limiting at the gateway.
