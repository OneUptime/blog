# Validation Summary: How to Set Up Zero-Trust Network Architecture with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Service mesh security
- Mutual TLS
- SPIFFE workload identities
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio Gateway and ServiceEntry
- Istio Telemetry
- Prometheus

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security policy examples: https://istio.io/latest/docs/ops/configuration/security/security-policy-examples/
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Kubernetes `Deployment` example in Step 2 was missing the required `spec.selector` and matching pod template labels for the `apps/v1` API. Added `spec.selector.matchLabels` and `spec.template.metadata.labels` using `app: order-service`.
- The egress text said the shown `ServiceEntry` used Istio's egress gateway. A `ServiceEntry` registers and controls access to an external service, but routing through an egress gateway also requires egress `Gateway`, `VirtualService`, and `DestinationRule` configuration. Updated the wording to avoid implying the snippet alone configures an egress gateway.

## Review Notes
The Istio security APIs shown use current `security.istio.io/v1`, `networking.istio.io/v1`, and `telemetry.istio.io/v1` resources. The examples assume the Istio root namespace is `istio-system`, which is the default but can be changed during installation.
