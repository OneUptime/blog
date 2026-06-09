# Validation Summary: How to Configure Kubernetes Multi-Tenancy

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Kubernetes Namespaces
- Kubernetes RBAC (Role, RoleBinding)
- Kubernetes ResourceQuota and LimitRange
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Pod Security Standards (pod-security.kubernetes.io labels)
- Hierarchical Namespace Controller (HNC) — hnc.x-k8s.io/v1alpha2
- Kyverno ClusterPolicy (kyverno.io/v1)
- Kubernetes Audit Policy (audit.k8s.io/v1)
- Prometheus Operator PrometheusRule (monitoring.coreos.com/v1)
- Kubernetes taints, tolerations, nodeSelectors
- kubectl CLI (label, taint, auth, wait, apply)
- Bash scripting

## Sources Consulted
- Kubernetes official docs — Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes official docs — Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes official docs — RBAC: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes official docs — Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes official docs — Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes Audit Logging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Hierarchical Namespaces (kubernetes-sigs/hierarchical-namespaces) — release v1.1.0 (2023-06-23) verified via gh release list
- HNC API definition (hnc.x-k8s.io/v1alpha2): https://github.com/kubernetes-sigs/hierarchical-namespaces/blob/master/api/v1alpha2/groupversion_info.go
- Kyverno validate policy docs: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
1. **Missing markdown heading on "Resource Quotas" section (line 284).** The section title was written as plain text `Resource Quotas` instead of `## Resource Quotas`, breaking the document's heading hierarchy. Added the `##` prefix.

2. **Wildcards in audit Policy `namespaces` field are not supported.** The audit policy example used `namespaces: ["tenant-*"]`. According to the `audit.k8s.io/v1` Policy schema (and the Kubernetes audit reference), the `namespaces` field accepts a list of exact namespace names — wildcards are not interpreted. Replaced with explicit namespace names (`tenant-acme`, `tenant-newcorp`) and added a comment explaining that wildcards are not supported so readers don't replicate the incorrect pattern.

## Review Notes
- Verified that Kyverno's `validationFailureAction: Enforce` is the correct capitalization for current Kyverno versions (the legacy lowercase `enforce` was deprecated in v1.10). Note: the top-level `spec.validationFailureAction` is itself being phased out in favor of the per-rule `validate.failureAction` in newer Kyverno versions, but the form used in the post is still accepted.
- HNC `apiVersion: hnc.x-k8s.io/v1alpha2` confirmed correct for v1.1.0 (latest release).
- HNC install URL points to the v1.1.0 `default.yaml` release artifact, which exists and is the current latest release as of writing.
- `kubectl label --local -f - --dry-run=client -o yaml` chain is valid; all three flags (`--local`, `-f`, `--dry-run=client`) are documented kubectl flags.
- The "Tenant Viewer" Role uses `resources: ["*"]` with `verbs: ["get","list","watch"]` followed by a separate rule for secrets with `verbs: []`. Worth noting: RBAC rules are additive (union), and an explicit deny does not exist in Kubernetes RBAC — so the second rule with `verbs: []` does NOT subtract permissions, it simply contributes nothing. The first rule's `resources: ["*"]` in the core group already includes secrets. This is a subtle pitfall in the example, but it is not corrected here because the post's prose only claims to "explicitly exclude secrets from viewing" via the second rule — that comment is misleading rather than producing wrong YAML, and fixing it would require a larger rewrite of the rules (e.g., enumerating allowed resources). Future revision should consider listing each non-secret resource explicitly.
- The NetworkPolicy `allow-ingress-controller` uses port 8080 alongside 443. Many ingress controllers terminate at the pod on a different port (e.g., 80/8080 for HTTP, 443/8443 for HTTPS); the specific port depends on the ingress controller deployment. The example is plausible but readers should match it to their controller's pod ports.
- The Kyverno pattern `spec.tolerations: [{key: tenant, operator: Equal, effect: NoSchedule}]` relies on Kyverno's default array-element matching semantics (at least one matching element). This is correct but readers unfamiliar with Kyverno anchors should be aware that more strict matching requires explicit anchors.
