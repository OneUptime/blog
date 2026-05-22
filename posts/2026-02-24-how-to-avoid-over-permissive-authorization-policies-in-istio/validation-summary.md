# Validation Summary: How to Avoid Over-Permissive Authorization Policies in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio mutual TLS identities and authorization matching
- Kubernetes kubectl
- Envoy/Istio access logs
- Prometheus and PrometheusRule
- jq

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy dry-run task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio MeshConfig global mesh options: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Kubernetes kubectl apply dry-run behavior checked with local `kubectl apply --help`

## Issues Found
- The access-log parsing command piped proxy logs into `jq` without noting that Istio's default access log encoding is text. Changed the comment to clarify that the command applies when access logs use JSON encoding.
- The sensitive-endpoint DENY policy used HTTP path matching without scoping the rule to a port. Istio documents that missing HTTP attributes in DENY rules are treated as matches for TCP traffic, so the example now includes `ports: ["8080"]`.
- The gradual-tightening example used a non-standard `security.istio.io/audit` annotation and described switching from audit to enforcement. Replaced it with Istio's documented `istio.io/dry-run: "true"` annotation and updated the enforcement step to remove the dry-run annotation.

## Review Notes
The AuthorizationPolicy examples use the stable `security.istio.io/v1` API and match Istio's documented rule semantics. Wildcard principal matching is technically valid as a presence match for a non-empty mTLS peer identity, but production policies should still prefer explicit principals or service accounts.
