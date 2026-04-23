# Validation Summary: How to Configure Istio Authorization Policies in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- mTLS
- JWT authentication

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio security concepts: https://istio.io/latest/docs/concepts/security/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio security troubleshooting: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Introducing Istio v1 APIs: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used the older `security.istio.io/v1beta1` API in all Istio examples. I updated the snippets to `security.istio.io/v1`, which is the current API version promoted in Istio 1.22.
- The action overview incorrectly stated that AuthorizationPolicy supports three actions. I corrected it to include `AUDIT`, which is documented alongside `ALLOW`, `DENY`, and `CUSTOM`.
- The introduction overstated Istio authorization behavior as universally "denied by default." I corrected this to the documented allow-nothing/default-deny pattern, where deny-by-default behavior is established by an ALLOW policy that matches nothing.
- Step 1 was labeled as a deny-all policy even though the YAML was the documented allow-nothing pattern (`spec: {}` with the default `ALLOW` action). I corrected the terminology to default-deny / allow-nothing so the explanation matches the actual policy semantics.
- Step 7 used `source.ip` to describe client-IP-based filtering for external traffic. I corrected the example to use ingress-gateway enforcement with `notRemoteIpBlocks`, which matches Istio’s documented approach for original client IP filtering.
- Step 8 used `kubectl exec ... curl -X POST localhost:15000/logging?rbac=debug`, which is not the supported debugging flow documented by Istio. I replaced it with `istioctl proxy-config log ... --level "rbac:debug"` and kept log inspection via `kubectl logs`.
- One selector comment described the target as a Service even though AuthorizationPolicy selectors match workloads. I corrected that wording.

## Review Notes
- Step 7 assumes the ingress path preserves the original client IP. For HTTP/HTTPS load balancers that use `X-Forwarded-For`, or deployments using PROXY protocol, Istio’s gateway topology settings must be configured accordingly for `remoteIpBlocks` or `remote.ip` matching to behave as expected.
- The ingress gateway principal and labels shown are valid examples from Istio documentation, but custom installations may use different labels or service-account names.
