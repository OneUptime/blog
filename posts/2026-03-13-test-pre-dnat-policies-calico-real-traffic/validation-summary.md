# Validation Summary: How to Test Pre-DNAT Policies for Calico Host Traffic with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico pre-DNAT host endpoint policy
- Calico host endpoints
- Kubernetes NodePort and LoadBalancer Services
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint policy overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post described LoadBalancer services too broadly. Kubernetes LoadBalancer implementations commonly allocate NodePorts by default, but Kubernetes also supports LoadBalancer implementations that route directly to pods with `spec.allocateLoadBalancerNodePorts: false`. Updated the wording to refer to NodePort-backed LoadBalancer services.
- The policy selector used `node == 'production-node'`, which would only work if the target host endpoints had a `node` label. Calico GlobalNetworkPolicy selectors match endpoint labels, not the HostEndpoint `spec.node` field. Updated the prerequisite and example to use an explicit host endpoint label, `role=production-node`.
- The blocked-source test only printed a message and did not run traffic. Added the same `curl` command and exit-code check for the blocked-source test.

## Review Notes
The `projectcalico.org/v3` GlobalNetworkPolicy API, `preDNAT: true`, `applyOnForward: true`, ingress-only pre-DNAT policy shape, destination port matching, CIDR source matching, and `calicoctl get globalnetworkpolicies -o wide` command are consistent with current Calico documentation. The example still assumes the operator runs the allowed and blocked tests from hosts in the corresponding CIDR ranges.
