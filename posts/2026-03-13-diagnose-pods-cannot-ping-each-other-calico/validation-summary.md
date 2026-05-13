# Validation Summary: How to Diagnose Pods That Cannot Ping Each Other with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico IP pools
- Calico Felix
- BGP routing
- IP-in-IP and VXLAN encapsulation
- iptables

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico NetworkPolicy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico BGP and node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico staged network policy reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy

## Issues Found
- The policy inspection commands checked Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy, but omitted Calico namespaced NetworkPolicy. Added `calicoctl get networkpolicy -n <namespace> -o yaml` because Calico documents namespaced NetworkPolicy separately from GlobalNetworkPolicy.
- The diagnostic pod step said the pod would be created without any NetworkPolicy applied. That is not generally true when namespace-wide default-deny policies or broad selectors exist. Updated the wording to say the pod should use labels not selected by pod-specific policies and noted that namespace-wide default-deny policies may still apply.
- The Felix iptables examples focused on `cali-INPUT` and `cali-OUTPUT`, which are less directly useful for pod-to-pod forwarding diagnosis. Replaced them with `cali-FORWARD` and workload endpoint chain inspection through `iptables-save`.
- The node firewall comment mentioned only IPIP even though the command checked both VXLAN and IPIP indicators. Updated the comment to cover both.
- The solution said to add an explicit ICMP allow to NetworkPolicy, which could be ambiguous with Kubernetes NetworkPolicy. Clarified that the ICMP allow belongs in Calico NetworkPolicy, since Calico supports ICMP protocol matching.
- The prevention section referred to "Calico network policy audit mode." Updated it to "Calico staged network policies," matching current Calico documentation for previewing policy behavior.

## Review Notes
The diagnostic commands are intentionally generic and depend on cluster access, node SSH access, and whether the installation uses iptables, nftables, eBPF dataplane, BGP, IPIP, or VXLAN. `kubectl` was not installed in the local review environment, so command syntax was verified against official Kubernetes reference documentation instead of local `--help` output.
