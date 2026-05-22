# Validation Summary: How to Audit Network Policy Compliance with Istio

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Istio PeerAuthentication and mTLS
- Istio AuthorizationPolicy
- istioctl configuration analysis
- Kubernetes kubectl and JSONPath/custom-column output
- Prometheus / PromQL with Istio standard metrics
- Istio sidecar injection
- Open Policy Agent and Rego

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio check-inject documentation: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent Rego `contains` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains

## Issues Found
- The mesh-wide PeerAuthentication wording assumed the policy always lives at `default` in `istio-system`. Istio applies mesh-wide PeerAuthentication from the configured root namespace, which is often but not necessarily `istio-system`, so the text now tells readers to use their mesh's actual root namespace and policy name.
- The default-deny detection script searched JSONPath output for `{}`, which is unreliable for Kubernetes object output and could miss valid default-deny AuthorizationPolicies. It now uses `kubectl -o json` with `jq` to identify namespace-wide ALLOW policies with no rules, which matches Istio's documented default-deny behavior.
- The sidecar-gap section said AuthorizationPolicies only work on pods with sidecars. That is accurate for sidecar-mode enforcement but not for every Istio data plane mode, so the wording now scopes the statement to sidecar mode.
- The first pod-without-sidecar JSONPath filter could match pods that had an `istio-proxy` container as well as another application container. It was replaced with a JSONPath listing plus `awk` filter that checks the full container-name list.
- The sidecar injection label explanation implied namespaces without injection labels never receive automatic injection. Istio can also inject based on pod labels or injector default policy, so the text now includes that caveat.
- The `istioctl analyze --use-kube=false -A my-policies/*.yaml` example mixed the live-cluster all-namespaces flag with local-file analysis. The command now matches Istio's documented local-file analysis form: `istioctl analyze --use-kube=false my-policies/*.yaml`.
- The OPA example used pre-Rego-v1 partial-set syntax. It now imports `rego.v1` and uses `deny contains msg if { ... }`, with the helper rule updated to Rego v1 syntax.

## Review Notes
The PromQL examples are valid for HTTP, HTTP/2, and gRPC Istio request metrics. TCP traffic auditing would need the Istio TCP metrics family instead of `istio_requests_total`.
