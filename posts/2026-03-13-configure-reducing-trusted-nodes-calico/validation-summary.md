# Validation Summary: How to Configure Calico Policies for Reducing Trusted Nodes

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint and automatic host endpoints
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Protect Kubernetes nodes guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico host endpoint failsafe rules reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The original post implied that a GlobalNetworkPolicy selector alone would protect Kubernetes node interfaces. Calico host policy applies to HostEndpoint resources, so I updated the prerequisites and implementation to require automatic host endpoints and added the documented `calicoctl patch kubecontrollersconfiguration default` command.
- The original policy selected `has(kubernetes.io/hostname)` directly. Automatic host endpoints sync node labels, but Calico documentation recommends adding explicit node labels for host endpoint policy targeting. I changed the policy to select `has(kubernetes-host)` and added `kubectl label` commands for the protected node set and trusted node.
- The original rules matched destination ports without specifying a protocol. Calico policy port matches should be paired with a transport protocol, so I added `protocol: TCP` to the SSH, etcd, and Kubernetes API rules.
- The original test expected denies on ports that are in Calico's default host failsafe list. Calico failsafe rules allow ports such as 22, 2379, 2380, and 6443 irrespective of policy until the failsafe configuration is changed. I added a note warning readers to replace failsafe settings with environment-specific entries before expecting those deny tests to fail.
- The introduction used "Trusted Node Reduction" as if it were a distinct Calico feature. I changed the wording to describe trusted node access through host endpoint policy, which matches the documented Calico model.

## Review Notes
The policy remains an illustrative starting point. Production clusters need environment-specific allowances for BGP, DNS, DHCP, Typha, external etcd, control-plane topology, and cloud-provider management paths before narrowing host failsafe ports or applying deny rules to node interfaces.
