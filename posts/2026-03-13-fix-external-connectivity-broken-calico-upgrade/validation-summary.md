# Validation Summary: How to Fix External Connectivity Broken After Calico Upgrade

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- calicoctl
- kubectl
- IPPool resources
- GlobalNetworkPolicy resources
- iptables NAT/MASQUERADE

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico default deny policy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- Corrected the root-cause wording from `natOutgoing` being set to `Disabled` to being set to `false`, because Calico IPPool `natOutgoing` is a boolean field.
- Replaced the sed-based IPPool update with the documented `calicoctl patch ippool ... -p '{"spec":{"natOutgoing": true}}'` command, which avoids brittle YAML text replacement and matches the official calicoctl patch example.
- Clarified that `kubectl rollout restart daemonset calico-node` recreates pods from the current desired DaemonSet version; the intended Calico upgrade manifest or operator change must be applied first if pod images differ.
- Adjusted the iptables verification expectation to look for Calico NAT chains or MASQUERADE for outgoing pod traffic rather than promising a direct pod-CIDR MASQUERADE rule in every output format.
- Reworded the conclusion so restarting `calico-node` is not presented as mandatory after every configuration change; the important validation step is confirming Calico rebuilt NAT rules and testing pod egress.

## Review Notes
The commands and resource fields are current for Calico Open Source 3.32 and the current Kubernetes kubectl reference. The `default-ipv4-ippool` name is common but cluster-specific; operators should confirm the actual IPPool name before applying the commands.
