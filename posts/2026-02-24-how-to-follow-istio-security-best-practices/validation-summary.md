# Validation Summary: How to Follow Istio Security Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio service mesh
- Istio mTLS and PeerAuthentication
- Istio AuthorizationPolicy
- Istio RequestAuthentication and JWT validation
- Istio certificate management and external CA integration
- Istio ServiceEntry and outbound traffic policy
- Istio Telemetry API and access logging
- Kubernetes ServiceAccounts and Deployments
- istioctl and kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authorization security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio ingress access control: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio access logging with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio plug in CA certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio custom CA integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio external services and REGISTRY_ONLY egress control: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Kubernetes Deployment example for `payment-service` omitted the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added `selector.matchLabels` and `template.metadata.labels`.
- The production CA example used `PILOT_CERT_PROVIDER: "istiod"`, which is the default Pilot DNS certificate provider and does not switch Istio to a production CA for workload certificates. Replaced it with the documented `cacerts` secret pattern for plugging CA certificates into Istio.
- The cert-manager external CA example only set `EXTERNAL_CA=ISTIOD_RA_KUBERNETES_API`, which is incomplete for the documented Kubernetes CSR integration. Replaced it with an IstioOperator example that includes the default cert signer, CA certificate mapping, `CERT_SIGNER_DOMAIN`, and `PILOT_CERT_PROVIDER`.
- The Telemetry access-log filter referenced `response.code` without checking whether the attribute exists. Istio documents that `response.code` may be absent when connections fail, so the expression now uses `has(response.code)` before comparing status codes.

## Review Notes
- The ingress IP allow-list example uses `ipBlocks`, which is correct when the packet source address is preserved, such as with a network load balancer and `externalTrafficPolicy: Local`. For HTTP/HTTPS load balancers using `X-Forwarded-For` or PROXY protocol, Istio recommends `remoteIpBlocks` with gateway topology configuration.
- The article does not pin an Istio version. The reviewed APIs are current in Istio latest documentation as of 2026-05-21.
