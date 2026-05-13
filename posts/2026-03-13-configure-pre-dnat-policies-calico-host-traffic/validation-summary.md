# Validation Summary: How to Configure Pre-DNAT Policies for Calico Host Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Kubernetes NodePort and LoadBalancer service traffic
- Pre-DNAT network policy
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Pre-DNAT policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico Apply policy to forwarded traffic: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Protect Kubernetes nodes / automatic host endpoints: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico Apply policy to Kubernetes node ports: https://docs.tigera.io/calico-enterprise/latest/network-policy/beginners/services/kubernetes-node-ports
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The GlobalNetworkPolicy rules matched destination ports without specifying a protocol. Calico's official policy examples specify a protocol when matching ports, and NodePort HTTP traffic in the example is TCP, so `protocol: TCP` was added to both the allow and deny rules.
- The policy selector used `node == 'production-node'`, which is a label selector, not a selector over the HostEndpoint `spec.node` field. The prerequisite was clarified to require host endpoints to be labeled for the target nodes so the selector works as shown.

## Review Notes
The Calico `preDNAT: true` and `applyOnForward: true` fields are valid for GlobalNetworkPolicy resources applied to host endpoints. Official Calico documentation confirms that pre-DNAT policy applies before DNAT, is used for Kubernetes NodePort traffic, must be ingress-only, and must set `applyOnForward: true`. The `calicoctl apply -f` and `calicoctl get globalnetworkpolicies -o wide` commands are valid; resource type names are case-insensitive and may be pluralized.
