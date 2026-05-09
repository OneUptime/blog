# Validation Summary: How to Test Calico Policies for Reducing Trusted Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Kubernetes
- calicoctl
- Network policy testing with netcat

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host protection guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- Calico automatic labels and selector guidance: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The original policy selected `has(kubernetes.io/hostname)` and used `kubernetes.io/hostname == 'trusted-node-01'`, which implied that Calico host policy directly selects Kubernetes Node labels. Calico GlobalNetworkPolicy applies to WorkloadEndpoint and HostEndpoint resources, so I changed the example to use HostEndpoint labels (`role == 'k8s-control-plane'` and `trust == 'trusted'`) and added a prerequisite that HostEndpoint resources must exist with `expectedIPs` and labels.
- The original rules matched destination ports without specifying a protocol. Calico policy examples and rule definitions use protocol-specific port matches, so I added `protocol: TCP` to the SSH, etcd, and Kubernetes API server rules.
- The original test expected default-denied behavior on ports that Calico includes in default failsafe host rules, including SSH, etcd, and the Kubernetes API server. I added a prerequisite to review failsafe host ports before testing these denials.

## Review Notes
The `calicoctl apply -f reduce-trusted-nodes.yaml` command is valid. The netcat commands are reasonable smoke tests, but results still depend on the cluster's HostEndpoint coverage, failsafe port configuration, routing, and whether the tested services are actually listening on the target node.
