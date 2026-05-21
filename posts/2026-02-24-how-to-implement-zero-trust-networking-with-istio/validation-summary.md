# Validation Summary: How to Implement Zero-Trust Networking with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio service mesh
- Kubernetes service accounts and deployments
- Istio mutual TLS with PeerAuthentication
- Istio AuthorizationPolicy
- Istio RequestAuthentication and JWT validation
- Prometheus metrics for Istio telemetry
- istioctl diagnostics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Deployment reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Kubernetes `apps/v1` Deployment example omitted the required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the manifest is valid.
- The mesh-wide mTLS text implied `istio-system` universally rather than the configured Istio root namespace. Clarified that `istio-system` is the common root namespace.
- The Prometheus query checked for `connection_security_policy="none"`, but current Istio standard metrics document `mutual_tls` for secure destination-reported traffic and `unknown` where the policy cannot be populated. Changed the query to check destination-reported traffic where `connection_security_policy!="mutual_tls"`.
- The roadmap suggested "CUSTOM action with logging" for audit mode. Current Istio docs define CUSTOM as external authorization and AUDIT as the audit action, with dry-run support via the `istio.io/dry-run` annotation. Updated the wording accordingly.

## Review Notes
The main Istio security resources use the current `security.istio.io/v1` API and the principal formats, default-deny AuthorizationPolicy example, PeerAuthentication STRICT mode, RequestAuthentication JWT fields, and `istioctl proxy-config secret` command are consistent with current official documentation. The namespace isolation example is technically valid as an allow-only same-namespace boundary policy, but teams should be careful when combining broad namespace-level ALLOW policies with more granular allow-list policies because ALLOW policies are additive.
