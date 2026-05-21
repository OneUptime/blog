# Validation Summary: How to Debug Why Authorization Policy is Blocking Traffic

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio mutual TLS and workload identity
- Kubernetes custom resources and kubectl
- Envoy RBAC logging
- istioctl proxy-config

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio Security Problems / authorization policy troubleshooting: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/

## Issues Found
- The evaluation order omitted CUSTOM policies. Updated the evaluation list and conclusion to state that CUSTOM policies are evaluated before DENY and ALLOW and can deny the request.
- The post treated `istio-system` as always being the mesh root namespace. Updated the wording to say the root namespace is often `istio-system`, because Istio's root namespace is configurable.
- The selector explanation did not mention root-namespace behavior. Updated it to clarify that an empty selector applies namespace-wide, or mesh-wide when the policy is in the Istio root namespace.

## Review Notes
The commands and YAML snippets use current Istio APIs and CLI flags. The post focuses on sidecar-oriented debugging; newer ambient or waypoint deployments can require `targetRefs` instead of selector-based policies, but that is outside the scope of the examples shown.
