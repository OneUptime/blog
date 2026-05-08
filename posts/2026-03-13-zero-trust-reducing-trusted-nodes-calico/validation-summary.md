# Validation Summary: Zero Trust Node Policies with Calico for Reducing Trusted Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Calico FelixConfiguration failsafe ports
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Protect Kubernetes nodes guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico HostEndpoint failsafe rules reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The original policy implied that a `GlobalNetworkPolicy` directly selected Kubernetes nodes by `kubernetes.io/hostname`. Calico policy applies to workload endpoints and host endpoints, not Kubernetes Node objects directly. Updated the prerequisites and implementation to require automatic HostEndpoints and label the nodes with `kubernetes-host`, matching Calico's Kubernetes node protection guidance.
- The source selector used `kubernetes.io/hostname == 'trusted-node-01'` without first establishing a policy label for trusted nodes. Changed it to `trusted-node == 'true'` and added the corresponding `kubectl label node trusted-node-01 trusted-node=true` command.
- The policy rules matched destination ports without an explicit protocol. Calico examples and rule semantics use `protocol: TCP` with TCP ports such as SSH, etcd, and the Kubernetes API, so each relevant rule now specifies TCP.
- The testing instructions said denied SSH, etcd, and Kubernetes API ports should be blocked, but Calico's default HostEndpoint failsafe rules allow those ports irrespective of normal policy. Added a caveat that the test result only applies after matching HostEndpoints exist and the relevant default failsafe ports have been narrowed.

## Review Notes
This post is technically valid as a concise guide, but production users should derive the exact allowed node ports from their Kubernetes distribution, control-plane topology, datastore mode, and Calico networking mode before narrowing Felix failsafe ports.
