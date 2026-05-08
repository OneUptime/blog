# Validation Summary: How to Verify Pod Networking with Calico on On-Prem Kubernetes

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- calicoctl
- BGP routing
- Linux routing
- iptables NAT
- BusyBox

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- BusyBox command reference for wget: https://busybox.net/BusyBox.html
- Netfilter iptables MASQUERADE target documentation: https://git.netfilter.org/iptables/tree/extensions/libxt_MASQUERADE.man

## Issues Found
- The TigeraStatus wording implied every Calico component directly reports `Available: True` there. Updated it to clarify that this applies to operator-managed installations and TigeraStatus entries.
- The routing-table check hard-coded `192.168`, which is only correct for clusters using that pod CIDR. Replaced it with a placeholder for the configured pod CIDR prefix.
- The BGP status command omitted `sudo`, while Calico documentation commonly shows `sudo calicoctl node status` because it communicates with the local Calico agent on the node.
- The BusyBox `wget` example used `--timeout=5`, which is not portable for the BusyBox wget shipped in common BusyBox images. Changed it to `-T 5`.
- The iptables NAT inspection command listed `MASQUERADE` as though it were a chain. MASQUERADE is a NAT target valid in `POSTROUTING`, so the command now lists the `POSTROUTING` chain and filters for MASQUERADE rules.

## Review Notes
The guide assumes an operator-managed Calico installation because it checks `calico-system`, `tigera-operator`, and `tigerastatus`. Non-operator manifest installations may place Calico components in different namespaces and may not have TigeraStatus resources.
