# Validation Summary: How to Migrate to Calico Policies for Reducing Trusted Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints and automatic host endpoints
- Kubernetes node security
- calicoctl
- TCP port access controls for Kubernetes API server, SSH, and etcd

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Protect Kubernetes nodes guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico selector-based host endpoint policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/selector
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Ports and Protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
- The original prerequisites did not state that automatic host endpoints must be enabled. Calico GlobalNetworkPolicy only protects Kubernetes node interfaces when host endpoints exist, so I added automatic host endpoints as a prerequisite.
- The original policy selected `has(kubernetes.io/hostname)`, which could be ambiguous and would not by itself guarantee the policy targets node host endpoints. I updated the selector to include `projectcalico.org/created-by == 'calico-kube-controllers'`, matching Calico automatic host endpoints.
- The original trusted-node source selector only matched the hostname label. I updated it to also require the automatic host endpoint label so the source match is scoped to node host endpoints.
- The original rules matched TCP ports without explicitly setting `protocol: TCP`. Calico examples and Kubernetes port references identify these as TCP services, so I added `protocol: TCP` to each port-based rule.
- The implementation steps applied the policy without showing how to enable automatic host endpoints. I added the documented `calicoctl patch kubecontrollersconfiguration default` command before applying the policy.

## Review Notes
The example assumes the cluster uses Calico-managed automatic host endpoints and that `trusted-node-01` is the value of the node's `kubernetes.io/hostname` label. Operators should confirm their actual node labels and management CIDRs before applying this policy.
