# Validation Summary: Troubleshoot Azure CNI Legacy Chaining with Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- AKS
- Azure CNI
- eBPF
- Linux traffic control

## Sources Consulted
- Cilium Azure CNI Legacy chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni/
- Cilium CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg bpf ipcache list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ipcache_list/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Azure AKS network policy best practices: https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Azure AKS migration to Cilium network policy: https://learn.microsoft.com/en-us/azure/aks/migrate-from-npm-to-cilium-network-policy

## Issues Found
- The node CNI configuration command read `/etc/cni/net.d/10-azure.conflist` from inside the debug container. Kubernetes node debug pods mount the node root filesystem at `/host`, and the exact CNI conflist filename can vary. Changed the command to list and read `/host/etc/cni/net.d/*.conflist`.
- The kubelet log command ran `journalctl` inside the debug container instead of against the node filesystem. Changed it to use `--profile=sysadmin` and `chroot /host journalctl -u kubelet`, matching Kubernetes node debug behavior.
- The Cilium commands used `cilium endpoint list`, `cilium bpf ipcache list`, and `cilium monitor`. Current Cilium troubleshooting and command reference documentation uses `cilium-dbg` for these in-agent diagnostics. Updated the commands accordingly.
- The `cilium monitor --type drop -n default` example implied `-n` filtered by namespace. In the Cilium command reference, `-n` means numeric identity output, not namespace filtering. Removed the namespace argument.
- The route conflict grep used hard-coded values `169.254` and `10.244`, which are not generally valid for all AKS Azure CNI deployments. Replaced them with a placeholder for the cluster's pod CIDR or pod IP prefix.

## Review Notes
- The post is technically relevant and remains useful as a focused troubleshooting guide for the legacy Azure CNI chaining mode described by Cilium.
- Cilium documents Azure CNI chaining as the legacy approach and recommends AKS BYO CNI or Azure CNI Powered by Cilium for most users, which aligns with the post's migration guidance.
- Some advanced Cilium features can be limited when chaining with another CNI, including Layer 7 policy and IPsec transparent encryption. This could be called out in a future revision, but it was not required to correct the existing post.
