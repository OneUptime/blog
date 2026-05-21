# Validation Summary: How to Create a Deny-All Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes
- kubectl
- YAML configuration

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Explicit Deny task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said deny-all health policies block Kubernetes health probes and cause liveness/readiness failures. Istio rewrites HTTP, TCP, and gRPC probes to the sidecar agent by default, so kubelet probes do not necessarily fail. Updated the section to clarify that deny-all blocks normal mesh traffic to health endpoints, and that probe failures are mainly a concern when probe rewriting is disabled or when health checks arrive as in-mesh traffic.
- The post said ALLOW policies cannot be used for exceptions. That was too broad: ALLOW cannot override traffic matched by DENY, but can allow traffic that a more specific DENY rule excludes, subject to Istio's ALLOW evaluation. Updated the selective-exception wording and health-check guidance.

## Review Notes
The AuthorizationPolicy snippets use the current `security.istio.io/v1` API and valid fields. The DENY precedence, empty-rule match behavior, namespace-wide targeting, root namespace scope, and `kubectl exec` command form were verified against official documentation.
