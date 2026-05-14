# Validation Summary: Common Mistakes to Avoid with Calico Pre-DNAT Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico pre-DNAT policy
- Calico host endpoints
- Kubernetes NodePort and LoadBalancer service traffic
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host forwarded traffic and pre-DNAT policy documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico protect hosts tutorial with NodePort pre-DNAT example: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts-tutorial
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview

## Issues Found
- The sample policy used `selector: node == 'production-node'`, which could be mistaken for matching the HostEndpoint `spec.node` field. Calico policy selectors match endpoint labels, so the prerequisite now states that host endpoints need matching labels and the example uses `host-endpoint == 'production-node'`.
- The sample rules matched destination ports without specifying a protocol. Calico's examples pair port matches with a protocol, and port-scoped rules should specify the intended L4 protocol, so both rules now include `protocol: TCP`.
- The verification command used `globalnetworkpolicies`. The Calico documentation lists `GlobalNetworkPolicy` as the resource kind and shows singular resource names in `calicoctl get` examples, so the command now uses `calicoctl get globalnetworkpolicy -o wide`.

## Review Notes
The core explanation of pre-DNAT policy, `preDNAT: true`, `applyOnForward: true`, host endpoint applicability, and ingress-only pre-DNAT behavior is consistent with Calico's current documentation. For UDP NodePorts, the example would need equivalent UDP rules.
