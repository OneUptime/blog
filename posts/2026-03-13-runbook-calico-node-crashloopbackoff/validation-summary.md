# Validation Summary: Runbook: Calico Node CrashLoopBackOff

## Status
validated

## Post Type
Runbook / Operational Reference

## Technologies Covered
- Calico CNI (v3.27.0 referenced)
- Kubernetes (kubectl, DaemonSet, ConfigMap, RBAC)
- Linux kernel modules (ipip, xt_set, nf_conntrack)
- BGP routing (mentioned in symptoms)
- etcd / Kubernetes datastore (KDD)

## Sources Consulted
- Calico official documentation: https://docs.tigera.io/calico/latest/
- Calico system requirements (kernel modules): https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico GitHub manifests: https://github.com/projectcalico/calico/tree/v3.27.0/manifests
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kubectl server-side apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Calico calico-node DaemonSet spec (init containers: upgrade-ipam, install-cni, mount-bpffs; main container: calico-node)

## Issues Found
No technical issues found.

All kubectl commands, label selectors (`k8s-app=calico-node`), container names, and flag usage are correct. The Calico v3.27.0 manifest URL resolves successfully. The kernel module list (ipip, xt_set, nf_conntrack) matches Calico's documented requirements. The `/etc/modules` persistence approach is appropriate for Debian/Ubuntu hosts. The server-side apply with `--field-manager=calico` and `--dry-run=server` validation is a valid pattern. The mermaid flowchart is syntactically correct and logically consistent with the four fix categories.

## Review Notes
- **Fix D heuristic**: The approach of deriving an etcd endpoint from `kubectl get endpoints kubernetes` only works reliably when the API server and etcd are co-located on the same control plane nodes (common in self-hosted/kubeadm clusters). For managed Kubernetes services (EKS/GKE/AKS) where etcd is not directly reachable, or where etcd runs on dedicated nodes, this heuristic will not produce a correct endpoint. This is an acceptable runbook shortcut but operators should verify their cluster topology.
- **Calico version**: v3.27.0 was released December 2023. As of the post date (March 2026), newer stable versions (v3.28, v3.29+) exist. Teams should pin to a version they have tested rather than always pulling latest, so this is not strictly an issue.
- **`/etc/modules` portability**: The persistence approach works on Debian/Ubuntu but RHEL/CentOS/Rocky systems typically use `/etc/modules-load.d/*.conf`. Not flagged as an error since the runbook does not claim distribution-agnosticism.
- **Container name `calico-node` in `kubectl logs ... -c calico-node`**: Correct — the `-c` is technically optional for single-main-container pods but is good practice when init containers are present.
