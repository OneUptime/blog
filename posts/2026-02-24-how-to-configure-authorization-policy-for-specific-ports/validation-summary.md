# Validation Summary: How to Configure Authorization Policy for Specific Ports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio AuthorizationPolicy
- Istio protocol selection
- Kubernetes Deployments
- Kubernetes kubectl

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio TCP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-tcp/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The Kubernetes Deployment example used `apiVersion: apps/v1` but omitted the required `.spec.selector` and matching `.spec.template.metadata.labels`. Added both so the manifest is valid and the later AuthorizationPolicy selector can match the created pods.
- The protocol detection section said Istio uses port names to determine the protocol and that unnamed ports default to TCP. Updated this to reflect current Istio behavior: Istio can automatically detect HTTP/HTTP2, protocol can be set explicitly on Kubernetes Service ports by name or `appProtocol`, and traffic is treated as TCP when the protocol cannot be determined.
- The TCP example said HTTP `methods` are ignored for TCP and the rule matches on remaining non-HTTP fields. Updated this to distinguish ALLOW behavior from DENY behavior: HTTP-only fields do not match TCP traffic in ALLOW rules, while missing HTTP attributes are treated as matches for DENY policies.

## Review Notes
The `istioctl x authz check <pod-name> -n default` command matches the official Istio command reference. The local environment does not have `istioctl` installed, so CLI verification was performed against official documentation instead of local `--help` output. YAML snippets were parse-checked locally with Python and PyYAML.
