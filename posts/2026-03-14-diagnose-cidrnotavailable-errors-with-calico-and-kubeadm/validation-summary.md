# Validation Summary: Diagnosing CIDRNotAvailable Errors in Calico and kubeadm

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubeadm
- Calico
- Calico IPAM
- calicoctl
- kubectl

## Sources Consulted
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm implementation details: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl node diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The introduction described `CIDRNotAvailable` as Calico failing to find a suitable CIDR block. Updated it to clarify that `CIDRNotAvailable` is a Kubernetes node PodCIDR allocation event, and that Calico IPAM does not use `Node.spec.podCIDR`.
- The event queries sorted by `.lastTimestamp`, which is less appropriate for current Kubernetes event output than `.metadata.creationTimestamp`. Updated the examples to sort by `.metadata.creationTimestamp`.
- The diagnostics did not check Kubernetes-assigned PodCIDRs on nodes. Added a `kubectl get nodes` custom-column command to inspect `.spec.podCIDR` and `.spec.podCIDRs`.
- The Calico diagnostic bundle command used `calicoctl node diag`, but the documented node command is `calicoctl node diags`; for a cluster-wide bundle from a kubeconfig-enabled workstation, the current command is `calicoctl cluster diags`. Updated the guide to use `calicoctl cluster diags`.
- The `calicoctl node status` comment implied a cluster-wide command. Updated it to clarify that the command checks status on the affected node.
- The namespace troubleshooting note assumed only `calico-system`. Updated it to locate `calico-node` pods across all namespaces, since Calico installs may use `calico-system` or `kube-system`.
- The RBAC example combined `kubectl auth can-i` action checking with `--list` and used a less portable Calico resource alias. Updated it to a direct `kubectl auth can-i create globalnetworkpolicies.projectcalico.org` check.

## Review Notes
The post remains a diagnostic guide rather than a remediation guide. Future improvements could include separate follow-up instructions for Kubernetes controller-manager CIDR exhaustion versus Calico IPPool exhaustion, but those are outside the requested scope of correcting technical inaccuracies.
