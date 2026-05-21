# Validation Summary: How to Test Authorization Policies Before Enforcement in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio dry-run authorization policies
- Envoy RBAC logging and metrics
- Kubernetes
- kubectl
- istioctl
- Prometheus and PromQL

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio dry-run AuthorizationPolicy task: https://istio.io/latest/docs/tasks/security/authorization/authz-dry-run/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/

## Issues Found
- The post described dry-run results as Envoy access-log fields `shadow_effective_policy_id` and `shadow_engine_result`. Official Istio docs describe dry-run results through proxy RBAC debug logs, Envoy RBAC metrics, and tracing tags. I changed the text to use `rbac:debug`, `shadow` proxy-log entries, and dry-run metric labels.
- The post said "Istio 1.19 and later" supports dry-run mode. Current official docs document the feature as an alpha `istio.io/dry-run` annotation for `ALLOW` and `DENY` policies without tying the guidance to 1.19. I changed this to "Current Istio releases" and noted the alpha status and action limitation.
- The RBAC debug logging method implied that applying a policy and watching logs was a pre-enforcement technique. Normal AuthorizationPolicies enforce immediately. I clarified that this method should be used with dry-run, staging, or canary rollout, and warned that a normal policy on a production workload enforces immediately.
- The targeted `DENY` example called traffic from namespaces outside `default` and `gateway` "external access". Because `notNamespaces` is a mesh namespace match derived from the peer certificate, I changed the explanation to "mesh namespaces other than `default` and `gateway`" and added the mTLS requirement.
- The canary selector explanation said unmatched pods continue without authorization enforcement. That could be inaccurate if other policies select those pods. I changed it to say unmatched pods are unaffected by this policy.
- The `istioctl x authz check` section described the command as simulating evaluation for a specific request. Official command docs show it checks AuthorizationPolicies applied to a pod or deployment. I changed the text to describe inspecting loaded policies and manually tracing expected behavior.
- The `istioctl analyze` example used `-n default` with a local file. The official examples pass local files directly, so I changed the example to `istioctl analyze authorization-policy.yaml`.

## Review Notes
The YAML snippets use the current `security.istio.io/v1` AuthorizationPolicy API and valid fields. The blog remains version-sensitive because Istio marks dry-run authorization policy support as alpha, and the exact proxy log and metric details are documented as manual troubleshooting outputs rather than a stable API.
