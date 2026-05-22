# Validation Summary: How to Block All Traffic and Selectively Allow in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Kubernetes ServiceAccounts and Deployments
- Kiali
- Prometheus metrics
- istioctl debugging commands

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authorization dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The rollout section incorrectly stated that Istio does not have a native dry-run mode for AuthorizationPolicy. Updated it to reference the documented experimental `istio.io/dry-run: "true"` annotation and the supported proxy log / Prometheus validation paths.
- The Kiali installation command used the old `release-1.20` sample manifest. Updated it to `release-1.29`, which matches the current Istio documentation consulted during review.
- The health-check explanation said kubelet probes bypass the sidecar. Updated the wording to reflect Istio's documented probe rewrite behavior: HTTP, TCP, and gRPC probes are rewritten to the sidecar agent on port 15020.
- The default-deny section implied every denied request becomes a 403. Updated it to distinguish HTTP 403 behavior from non-HTTP proxy-level denial.

## Review Notes
The AuthorizationPolicy examples use the current `security.istio.io/v1` API, valid ALLOW policy structure, valid peer principal format, and valid `operation.ports` string values. The `principals` matches require mTLS, which the post correctly establishes with STRICT PeerAuthentication and per-workload ServiceAccounts. The ingress gateway service account name may vary in customized installations, so users should verify it in their own cluster.
