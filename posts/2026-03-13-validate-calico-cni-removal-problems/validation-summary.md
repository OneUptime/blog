# Validation Summary: How to Validate Calico CNI Removal is Complete

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico CNI
- Kubernetes
- kubectl
- Linux CNI configuration directories
- iptables
- SSH
- Mermaid diagrams

## Sources Consulted
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico CNI plugin configuration reference: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico CNI installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico node decommissioning guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node

## Issues Found
- The RBAC validation only checked ClusterRoles, but Calico CNI installation can also create ClusterRoleBindings. Updated the command to check both `clusterrole` and `clusterrolebinding`.
- The node CNI config check used `ls | grep | wc`, which is fragile when the directory is missing or filenames differ in case. Updated it to use `find` with a Calico filename match and a safe fallback.
- The iptables validation could assign a two-line `0` value when `grep -c` found no matches and exited non-zero, causing the numeric comparison to fail. Updated it to run the grep remotely with a forced zero exit status and to inspect `iptables-save` output for `cali-` chains/rules.
- The new CNI health check used `grep -v Running | grep -v Completed`, which always includes the table header and is less precise than filtering pod phases. Updated it to use Kubernetes field selectors for pods whose phase is neither `Running` nor `Succeeded`.

## Review Notes
The checklist is technically sound for Linux nodes using the iptables dataplane. Clusters using Calico eBPF, nftables mode, managed Kubernetes node access restrictions, Windows nodes, or nonstandard SSH access may need adjusted node-level checks.
