# Validation Summary: How to Validate Kubernetes Egress with Calico in a Lab Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico networking and outgoing NAT
- Calico Cloud / Enterprise domain-based egress policy
- kubectl
- iptables
- DNS egress

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico Configure outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Enterprise DNS policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico Enterprise NetworkPolicy resource documentation: https://docs.tigera.io/calico-enterprise/latest/reference/resources/networkpolicy
- Calico Cloud NetworkPolicy resource documentation: https://docs.tigera.io/calico-cloud/reference/resources/networkpolicy

## Issues Found
- The CIDR-based Kubernetes NetworkPolicy example used two separate egress rules: one with only `ports` and one with only `to`. Kubernetes egress rules match both `to` and `ports` within the same rule, while separate rules are additive. This would have allowed TCP/443 to any destination and all ports to the selected IP. I combined `to` and `ports` into one rule so the example allows only TCP/443 to the selected CIDR.
- The CIDR-based allow test tried to resolve `ifconfig.me` from the selected pod after the deny-all egress policy had already been applied. Since DNS egress was still blocked at that point, the lookup or later curl command could fail for the wrong reason. I changed the example to resolve the endpoint from the workstation and use curl's `--resolve` option so the pod connects to the allowed IP without needing DNS egress.
- The Calico Cloud/Enterprise FQDN policy example omitted `types: [Egress]` and did not allow DNS egress inside the policy. Calico's domain-based policy examples include egress policy type and a DNS allow rule before the domain allow rule. I added both so the snippet matches the documented pattern.

## Review Notes
- The SNAT behavior is accurate for Calico IP pools with `natOutgoing: true`; Calico documents that packets from pods in those pools to destinations outside Calico IP pools are source NATed to the node IP.
- The deny-all egress example is consistent with Kubernetes NetworkPolicy semantics. Kubernetes also documents that a default deny-all egress policy blocks DNS unless a separate DNS allow policy is added.
- NetworkPolicy enforcement still depends on a network plugin that implements Kubernetes NetworkPolicy. This is satisfied by the post's Calico prerequisite.
