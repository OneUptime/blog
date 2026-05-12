# Validation Summary: How to Secure Calico IPAM Checks

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Calico (calicoctl, IPAM)
- Kubernetes (RBAC, CRDs, audit policy)
- kubectl
- Mermaid (diagram)

## Sources Consulted
- Calico Resources Reference: https://docs.tigera.io/calico/latest/reference/resources/
- calicoctl IPAM commands: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl Quick Reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
No technical issues found.

- The Calico IPAM CRD plural names (`ipamblocks`, `ipamconfigs`, `ipamhandles`, `blockaffinities`, `ippools`) are correct.
- The RBAC `ClusterRole` (rbac.authorization.k8s.io/v1) schema with `apiGroups`, `resources`, `verbs` is valid.
- The Kubernetes audit policy (`audit.k8s.io/v1`) structure with `level`, `resources` (containing `group` and `resources` array), and `verbs` is valid.
- `calicoctl ipam show`, `calicoctl ipam check`, and `calicoctl ipam release --ip=<IP>` are all valid current calicoctl commands and flags.
- `kubectl get pod --all-namespaces -o wide` does display pod IPs and is a reasonable approach to find a pod by its IP.

## Review Notes
- The RBAC and audit policy target the underlying CRD API group `crd.projectcalico.org` (where the actual IPAM CRDs are stored). This is correct for direct CRD-level RBAC and audit. Users who interact via calicoctl/kubectl-calico typically go through the aggregated `projectcalico.org/v3` API; for that interaction path, RBAC/audit would need to target the aggregated API group instead. The post's approach is appropriate for protecting the raw IPAM data layer, which is exactly what it claims to do.
- `grep "${SUSPECT_IP}"` will substring-match (e.g., searching for `192.168.1.4` would also match `192.168.1.42`). For production use, a stricter check (e.g., `grep -w` or filtering by the IP column) would be more robust, but the current snippet is illustrative and not incorrect.
- No deprecation warnings: all APIs referenced (`rbac.authorization.k8s.io/v1`, `audit.k8s.io/v1`, Calico CRDs) are current and stable as of the post date.
