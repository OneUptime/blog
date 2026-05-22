# Validation Summary: How to Configure Egress Network Policies with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio ServiceEntry
- Istio Sidecar
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Istio Telemetry API
- Prometheus
- Kubernetes NetworkPolicy

## Sources Consulted
- Istio documentation: Accessing External Services - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio documentation: Egress Gateways - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio reference: ServiceEntry - https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio reference: Sidecar - https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio reference: VirtualService - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio reference: AuthorizationPolicy - https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio reference: Telemetry - https://istio.io/latest/docs/reference/config/telemetry/
- Istio documentation: Envoy Access Logs - https://istio.io/latest/docs/tasks/observability/logs/access-log/

## Issues Found
- The post described `REGISTRY_ONLY` and Sidecar egress scoping as stronger security enforcement than Istio documents. Updated the wording to clarify that these control mesh-routed proxy configuration and should be combined with egress gateways plus network-level enforcement for security-sensitive egress.
- The original `AuthorizationPolicy` example selected `payment-service`, which would apply policy to that workload as a protected destination, not authorize its outbound calls to Stripe. Replaced it with Sidecar scoping examples and added a caveat about using gateway and network controls for enforcement.
- The Sidecar example originally excluded `api.stripe.com` while still including `"./*"`, but the ServiceEntry was in the same namespace, so it would still be included. Moved external ServiceEntry examples to an `external-services` namespace and allowed only `external-services/api.stripe.com` for the payment workload.
- TLS ServiceEntry port names used `https` while the protocol was `TLS`. Updated these to `tls` to match Istio's documented examples and port naming convention.
- The egress gateway VirtualService example was missing the DestinationRule subset and explicit port matches used by Istio's documented HTTPS passthrough egress gateway pattern. Added the DestinationRule and port matches.
- The blocking example mixed an HTTP fault route with a TLS port, which would not return a 403 for HTTPS passthrough traffic. Scoped the example to HTTP destinations and used `directResponse`.
- The monitoring query was described as showing all external calls. Updated the explanation to clarify it primarily shows passthrough unknown-destination traffic and that registered ServiceEntry traffic should be queried by the registered destination or ServiceEntry namespace.

## Review Notes
The post now reflects the current Istio v1 API surface and the official Istio guidance that egress gateway routing alone is not a complete security boundary unless external network controls prevent workloads from bypassing the sidecar or gateway.
