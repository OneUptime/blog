# Validation Summary: How to Fix Calico Pods Cannot Reach External Services

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- CoreDNS
- NetworkPolicy and GlobalNetworkPolicy
- IPPool outgoing NAT
- kubectl and calicoctl
- iptables NAT

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico installation notes showing install-dependent calico-node namespace: https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- Kubernetes DNS debugging guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The calico-node restart commands hard-coded the `calico-system` namespace. Calico installations can place `calico-node` in different namespaces, including `kube-system`, depending on the installation method. Changed the snippet to discover the namespace from the `calico-node` pod on the affected node before deleting the pod, checking rollout status, and verifying iptables rules.
- The policy comments said DNS was allowed specifically to CoreDNS and HTTPS was allowed, but the rules allowed DNS to any destination on port 53 and allowed both HTTP and HTTPS. Updated the comments so they accurately describe the rules without changing the policy behavior.

## Review Notes
The examples assume IPv4 pod pools and an iptables-based Calico dataplane. Clusters using IPv6, eBPF dataplane behavior, non-default IP pool names, or private external service ranges may need adjusted CIDRs, policy destinations, and verification commands.
