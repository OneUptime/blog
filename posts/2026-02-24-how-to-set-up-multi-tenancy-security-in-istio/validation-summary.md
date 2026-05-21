# Validation Summary: How to Set Up Multi-Tenancy Security in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio Sidecar
- Istio Gateway and VirtualService
- Istio ServiceEntry and egress control
- Kubernetes ResourceQuota
- Kubernetes RBAC
- Prometheus metrics

## Sources Consulted
- Istio PeerAuthentication reference - https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference - https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task, including deny-all policy behavior - https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio Sidecar reference - https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ServiceEntry reference - https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio egress control task, including `meshConfig.outboundTrafficPolicy.mode` - https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio Gateway reference - https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Envoy statistics documentation - https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio standard metrics reference - https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes `kubectl label` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes ResourceQuota documentation - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes RBAC documentation - https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The health-check AuthorizationPolicy originally applied to every workload in the namespace and allowed unauthenticated `GET` access to `/healthz` and `/readyz`, while the surrounding text said nothing from other tenants could reach the namespace. I added a workload selector for `app: frontend` and clarified that explicitly allowed health endpoints are exceptions.
- The egress section claimed that namespace-scoped ServiceEntries alone mean Acme cannot reach PayPal and Globex cannot reach Stripe. Istio documents `exportTo` as a visibility control, while blocking unknown external services requires `meshConfig.outboundTrafficPolicy.mode: REGISTRY_ONLY` or another enforcement point such as an egress gateway. I corrected the wording to make that requirement explicit.
- The "Resource Quotas for Tenants" line was missing markdown heading syntax. I changed it to a level-two heading so the section is rendered consistently.

## Review Notes
- The Istio examples use current `security.istio.io/v1` and `networking.istio.io/v1` APIs.
- The default-deny AuthorizationPolicy using `spec: {}` is valid and matches Istio's documented deny-all behavior for workloads in the policy namespace.
- The Sidecar examples are correct for configuration scoping, but Istio explicitly cautions that Sidecar scoping is not an outbound traffic enforcement mechanism.
- The ingress gateway service account principal is correct for the common default Istio ingress gateway installation; clusters with custom gateway service accounts need to adjust that principal.
