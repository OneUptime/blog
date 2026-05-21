# Validation Summary: How to Debug Authorization Policy Denied Requests in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio RequestAuthentication
- Envoy RBAC filter
- Kubernetes custom resources
- `istioctl`
- `kubectl`

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security concepts, authorization implicit enablement and policy targets: https://istio.io/latest/docs/concepts/security/
- Istio security common problems, authorization troubleshooting and RBAC debug logs: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio security best practices, default-deny authorization pattern: https://istio.io/latest/docs/ops/best-practices/security/
- Istio `istioctl` command reference, including `experimental authz check`, `proxy-config log`, `proxy-config listener`, and `experimental describe pod`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio authentication policy task, JWT request principals and authorization policy examples: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/

## Issues Found
- The policy evaluation section omitted the `AUDIT` action. Added a short note that AUDIT policies can mark matching requests for audit logging but do not allow or deny traffic.
- The RBAC log example used an exact "no matched policy found" line without the common `rbac_log:` prefix. Adjusted the wording to present it as an example denial without a matching ALLOW rule.
- The ALLOW-policy default-deny explanation said "any ALLOW policy" without qualifying that the policy must apply to the workload. Clarified that the default-deny behavior applies to workloads with an applicable ALLOW policy.
- The "empty ALLOW policies" section could be confused with an empty rule (`rules: - {}`), which matches everything for ALLOW. Renamed and reworded it to "ALLOW policies with no rules" and used `allow-nothing`, matching Istio documentation. Added a note to also check for omitted `rules` fields.
- The scenario about adding an ALLOW policy said "all other services broke," which overstated the scope. Clarified that the impact is other traffic to the workload the policy applies to.

## Review Notes
The post is technically current for Istio 1.30 documentation as of 2026-05-21. The `istioctl x` commands are aliases for experimental commands in Istio's command reference, so future Istio releases could change their output format or stability status.
