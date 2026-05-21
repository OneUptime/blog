# Validation Summary: How to Debug L4 Policy Enforcement Issues in Ambient

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Istio AuthorizationPolicy
- Kubernetes kubectl
- istioctl
- Prometheus metrics

## Sources Consulted
- Istio ambient Layer 4 security policy documentation: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio ambient data plane documentation: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio ambient authorization policy getting started guide: https://istio.io/latest/docs/ambient/getting-started/enforce-auth-policies/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference for ztunnel-config: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio ztunnel troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/

## Issues Found
- Corrected the explanation of L7 fields in ztunnel-targeted ambient AuthorizationPolicies. Istio documentation states that ztunnel cannot enforce L7 attributes and fails safe by treating such policies as DENY, rather than ignoring the L7 fields and allowing the TCP connection.
- Clarified mesh-wide policy behavior. A policy in the Istio root namespace applies mesh-wide, but an explicit DENY-all policy is not overridden by namespace-level ALLOW policies because DENY takes precedence. The example was corrected to describe an allow-nothing baseline instead.
- Replaced non-documented ztunnel metric names with documented Istio TCP metrics, and clarified that ztunnel logs should be used to inspect policy denials.

## Review Notes
The remaining commands and YAML examples are consistent with the current Istio ambient and AuthorizationPolicy documentation. The post assumes the default Istio root namespace is `istio-system`; deployments with a custom root namespace should adjust the examples accordingly.
