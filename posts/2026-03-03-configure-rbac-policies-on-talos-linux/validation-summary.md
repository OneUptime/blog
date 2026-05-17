# Validation Summary: How to Configure RBAC Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl`)
- Kubernetes RBAC (`rbac.authorization.k8s.io/v1`)
- `kubectl` (auth can-i, impersonation flags, get/describe)
- kube-apiserver audit logging
- Aggregated ClusterRoles

## Sources Consulted
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes user-facing roles (admin/edit/view): https://kubernetes.io/docs/reference/access-authn-authz/rbac/#user-facing-roles
- Aggregated ClusterRoles: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#aggregated-clusterroles
- kubectl auth can-i / impersonation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#user-impersonation
- kube-apiserver audit logging flags: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Talos v1.8 APIServerConfig reference: https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/ (confirms `extraArgs`, `extraVolumes`, and `auditPolicy` fields exist on `cluster.apiServer`)

## Issues Found

1. **Audit logging example would have broken kube-apiserver.** The original example added `audit-policy-file: "/etc/kubernetes/audit-policy.yaml"` via `extraArgs` without using `extraVolumes` to mount such a file or providing the policy itself. Because the kube-apiserver static pod on Talos does not mount that path by default, the API server would fail to start (audit-policy-file points to a nonexistent file inside the container). Fixed by replacing the `audit-policy-file` arg with Talos's idiomatic `cluster.apiServer.auditPolicy` field, which Talos uses to generate the policy file and wire it into the kube-apiserver static pod automatically. The log-rotation flags (`audit-log-path`, `audit-log-maxage`, `audit-log-maxbackup`, `audit-log-maxsize`) are retained in `extraArgs` since they are valid kube-apiserver flags and Talos mounts `/var/log/kubernetes/audit/` for audit output when `auditPolicy` is set.

## Review Notes

- The `talosctl logs kube-apiserver -n <control-plane-ip> | grep authorization-mode` command works in practice because kube-apiserver logs its command-line flags at startup, but an alternative verification is to inspect the static pod spec via `kubectl -n kube-system get pod -l component=kube-apiserver -o yaml`. Not changed — the shown command is valid.
- `kubectl auth can-i delete nodes --as="" --as-group="developers"` uses an empty `--as` to test group-only impersonation. This is uncommon but accepted by kubectl; the empty user becomes the anonymous identity while the group is still evaluated. Left as written.
- The built-in role descriptions (`cluster-admin`, `admin`, `edit`, `view`) match the Kubernetes user-facing roles documentation, including the caveat that `admin` cannot modify ResourceQuotas or the namespace object itself.
- The aggregated ClusterRole example correctly uses the `rbac.authorization.k8s.io/aggregate-to-view: "true"` label; the built-in `view` ClusterRole has an `aggregationRule` selecting this label, so the statement that bindings to `view` automatically pick up the new permissions is accurate.
- All RBAC YAML manifests (`apiVersion: rbac.authorization.k8s.io/v1`, kinds, `apiGroups`, `resources`, `verbs`, `resourceNames`, subresources like `pods/log`, `roleRef`/`subjects` structure) are syntactically correct and reflect the current stable API.
