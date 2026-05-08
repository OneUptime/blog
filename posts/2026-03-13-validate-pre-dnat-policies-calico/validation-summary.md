# Validation Summary: How to Validate Calico Pre-DNAT Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico pre-DNAT host endpoint policy
- Kubernetes NodePort and LoadBalancer service traffic
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT host endpoint policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico apply policy to forwarded traffic documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico apply policy to Kubernetes node ports documentation: https://docs.tigera.io/calico/latest/network-policy/services/kubernetes-node-ports
- Calico protect Kubernetes nodes documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The example selector used `node == 'production-node'`, which could be misread as selecting the HostEndpoint `spec.node` field. Calico policy selectors match labels on endpoints. Updated the prerequisite to require labels for policy selection and changed the selector to `has(kubernetes-host) && environment == 'production'`, matching Calico's documented pattern of selecting labeled host endpoints or labels synced from Kubernetes nodes.
- The rules matched destination ports without specifying a protocol. Calico's official policy examples specify `protocol: TCP` when matching TCP NodePort traffic by port, and the post tests with HTTP over `curl`. Added `protocol: TCP` to both the allow and deny rules.

## Review Notes
- The post correctly states that pre-DNAT policy is evaluated before destination NAT and is appropriate for Kubernetes NodePort access control.
- The post correctly pairs `preDNAT: true` with `applyOnForward: true` and uses ingress-only policy rules, as required by Calico.
- The `calicoctl get globalnetworkpolicies -o wide` command uses a valid Calico resource alias and output option.
