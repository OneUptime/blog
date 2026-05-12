# Validation Summary: How to Secure Calico eBPF Troubleshooting

## Status
validated

## Post Type
Tutorial / Guide (security controls for Calico eBPF troubleshooting)

## Technologies Covered
- Calico (eBPF dataplane)
- Kubernetes RBAC (ClusterRole, Role, ClusterRoleBinding, RoleBinding)
- Kubernetes Pod Security Standards (privileged, restricted profiles)
- Kubernetes ResourceQuota
- Kubernetes audit policy / audit logs
- `kubectl create token` (TokenRequest API)
- `kubectl --as` impersonation
- bpftool
- Mermaid (flowchart)

## Sources Consulted
- Kubernetes RBAC reference — PolicyRule schema (apiGroups, resources, resourceNames, verbs, nonResourceURLs; no `namespaces` field): https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes auditing — Policy rule fields including `namespaces`: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Pod Security Admission labels (`pod-security.kubernetes.io/enforce`, `audit`, `warn`): https://kubernetes.io/docs/concepts/security/pod-security-admission/
- `kubectl create token` (`--duration`, `--namespace`, ServiceAccount-bound): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- ResourceQuota object reference: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Calico projectcalico.org CRD API group: https://docs.tigera.io/calico/latest/reference/resources/overview
- bpftool man page (`bpftool prog list`): https://docs.kernel.org/bpf/

## Issues Found
1. **Invalid `namespaces` field in ClusterRole PolicyRule.** The original ClusterRole listed `namespaces: ["calico-system"]` and `namespaces: ["calico-debug"]` inside individual rules. The Kubernetes RBAC PolicyRule type has no `namespaces` field — the apiserver ignores unknown fields (or rejects via strict decoding), so the manifest would not enforce the intended scoping and would grant `pods/exec` and `pods` CRUD cluster-wide. Replaced with the correct pattern: a cluster-wide `ClusterRole` for read-only access to `projectcalico.org/*`, plus two namespace-scoped `Role`s (in `calico-system` and `calico-debug`) bound with `RoleBinding`s. Added a one-line explanation above the YAML so the structural change is obvious to readers.
2. **Misleading Pod Security comment.** The comment said `# But audit restricted everywhere else` next to `pod-security.kubernetes.io/audit: restricted`. PSA labels are per-namespace, not cluster-wide — the `audit` label only affects pods admitted into *this* namespace. Reworded the comments to describe what the label actually does (audit annotations on workloads failing the restricted profile in this namespace).
3. **`kubectl get events --field-selector reason=exec` does not surface exec activity.** Pod exec is captured in the kube-apiserver audit log, not the core Events API — that command returns nothing on a normal cluster and would mislead readers. Replaced with a `jq` filter over `/var/log/kubernetes/audit.log` selecting `objectRef.subresource=="exec"` scoped to the two relevant namespaces, and added a clarifying comment.

## Review Notes
- The `kubectl create token calico-troubleshooter --duration=4h --namespace=calico-system` example assumes the ServiceAccount `calico-troubleshooter` already exists in `calico-system` and is bound to the troubleshooter RBAC. The post does not explicitly create that ServiceAccount, but the example reads as illustrative rather than a complete end-to-end recipe, so I left it as-is.
- The audit policy snippet inside the `cat <<EOF` is only the rule fragment — a real audit policy file also needs `apiVersion: audit.k8s.io/v1`, `kind: Policy`, and a top-level `rules:` list. The surrounding text frames it as content to add to `audit-policy.yaml`, so this is acceptable as a snippet but a reader copying it verbatim would need to wrap it.
- The audit policy rule's `namespaces` field is correct here (Audit `PolicyRule` does support `namespaces`, unlike RBAC `PolicyRule`).
- `--duration` on `kubectl create token` accepts Go duration strings (`4h` is valid). The apiserver may cap the lifetime via `--service-account-max-token-expiration`; worth flagging only as a caveat, not an error.
- Path `/var/log/kubernetes/audit.log` matches typical kubeadm / managed-cluster conventions; cloud-managed control planes (EKS/GKE/AKS) ship audit logs to their respective logging services instead, but that's expected reader knowledge for a security-ops post.
