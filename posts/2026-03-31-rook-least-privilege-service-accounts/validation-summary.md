# Validation Summary: How to Implement Least Privilege for Rook-Ceph Service Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Kubernetes RBAC (ClusterRole, ClusterRoleBinding, Role)
- Kubernetes Pod Security Admission
- kubectl CLI (auth can-i, get, describe, apply)

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Rook-Ceph RBAC and security documentation: https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth_can-i/
- Kubernetes API resource scoping (cluster-scoped vs namespace-scoped): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found

### Issue 1: Incorrect `-n` flag on ClusterRoleBinding query
- **What was wrong:** The command `kubectl get clusterrolebinding -n rook-ceph | grep rook` included the `-n rook-ceph` flag. ClusterRoleBindings are cluster-scoped resources, so the `-n` flag is silently ignored by kubectl. This misleads readers into thinking the flag filters by namespace.
- **What was changed:** Removed `-n rook-ceph` from the command, resulting in `kubectl get clusterrolebinding | grep rook`.
- **Why:** Cluster-scoped resources are not namespaced. Including `-n` implies namespace filtering that doesn't happen and teaches incorrect kubectl usage.

### Issue 2: Pod Security Admission `restricted` profile would break Rook-Ceph
- **What was wrong:** The post recommended enforcing the `restricted` Pod Security Standard on the `rook-ceph` namespace. The `restricted` profile requires: no running as root, dropping all capabilities, read-only root filesystems, and non-privileged containers. Rook-Ceph OSD pods need privileged access to raw block devices, CSI driver pods need host path mounts and elevated privileges, and several Ceph daemons run as root. Enforcing `restricted` would prevent these pods from scheduling.
- **What was changed:** Changed `enforce` from `restricted` to `baseline`, kept `warn` as `restricted`, and added an explanatory note about why `restricted` breaks Rook-Ceph.
- **Why:** The `baseline` profile allows the elevated privileges that Rook-Ceph requires while still preventing known privilege escalation vectors (like hostPID, hostNetwork without need, etc.). Setting `restricted` as a warning level lets operators identify which pods could potentially be further hardened without breaking functionality.

## Review Notes
- The minimal ClusterRole example is intentionally simplified for demonstration purposes. A production Rook-Ceph operator requires access to additional resources (nodes, PersistentVolumes, StorageClasses, CSI-related resources, etc.). Readers implementing this in production should use the upstream Rook Helm chart's RBAC as a baseline and remove only clearly unnecessary permissions.
- The `rook-ceph-global` ClusterRole name referenced in the audit step is the correct default name used by Rook's Helm chart.
- All YAML manifests are syntactically correct and use the correct `rbac.authorization.k8s.io/v1` API version.
- The `kubectl auth can-i --as=system:serviceaccount:...` impersonation syntax is correct and is the standard way to test RBAC policies.
