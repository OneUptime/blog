# Validation Summary: Zero Trust with Pre-DNAT Policies for Calico Host Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Calico pre-DNAT policy
- Kubernetes NodePort and LoadBalancer Services
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico host endpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Kubernetes node host endpoint policy guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post described LoadBalancer services too broadly. Kubernetes LoadBalancer Services allocate node ports by default, but Kubernetes also supports LoadBalancer implementations that route directly to pods with `spec.allocateLoadBalancerNodePorts: false`. I narrowed the wording to LoadBalancer services that use or forward through node ports.
- The example policy used `selector: node == 'production-node'`, which could be mistaken for matching the HostEndpoint `spec.node` field. Calico policy selectors match endpoint labels, so I changed the prerequisite and selector to use an explicit `environment=production` label.
- The example policy matched destination ports without specifying a transport protocol. Calico examples and policy semantics associate port matches with protocol-specific traffic, so I added `protocol: TCP` to match the `curl` test and common HTTP NodePort usage.

## Review Notes
Pre-DNAT policies are valid only for host endpoint policy and must use `applyOnForward: true`, which the post already does. Pre-DNAT policy only supports ingress rules and does not have normal host endpoint default-drop behavior, so explicit deny rules are required for a zero-trust-style allowlist.
