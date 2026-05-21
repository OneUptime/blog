# Validation Summary: How to Set Up ALLOW Authorization Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio ingress gateway authorization
- Kubernetes workloads, service accounts, and health probes
- istioctl and kubectl

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The policy evaluation flow showed DENY before CUSTOM. Istio evaluates CUSTOM policies first, then DENY, then ALLOW, so the Mermaid diagram and later DENY explanation were corrected.
- The service-account principal examples did not mention the mTLS requirement. Added a note that `source.principals` depends on peer identity from mutual TLS.
- The ingress IP allow-list example applied `ipBlocks` to an application workload. Updated it to target the ingress gateway with `remoteIpBlocks`, and clarified when to use `ipBlocks` versus `remoteIpBlocks`.
- The JWT authorization example implied AuthorizationPolicy alone validates JWTs. Clarified that a matching RequestAuthentication policy must be configured first.
- The health probe gotcha stated that Kubernetes probes always need ALLOW rules. Updated it to reflect Istio's default probe rewrite behavior and the caveat for disabled rewrite.
- The `istioctl proxy-config listener` example used the shorthand `deploy/backend`. Updated it to the documented resource form `deployment/backend`.

## Review Notes
The remaining YAML examples use the current `security.istio.io/v1` API and valid AuthorizationPolicy fields. Path glob matching with suffix `*`, empty rules, namespace-level policies without selectors, and OR behavior across rules and policies are consistent with the current Istio documentation.
