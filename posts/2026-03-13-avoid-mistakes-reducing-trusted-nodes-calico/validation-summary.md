# Validation Summary: Common Mistakes to Avoid When Reducing Trusted Nodes with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- calicoctl
- Network policy for node security

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Protect Kubernetes nodes guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico Protect hosts and VMs guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- Calico Apply policy to forwarded traffic guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Install calicoctl guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The original policy did not state that HostEndpoint objects are required for Calico host policy to protect node interfaces. Added a prerequisite for manual or automatic HostEndpoints and added the documented `calicoctl patch kubecontrollersconfiguration default` command to enable automatic HostEndpoints.
- The original policy selected `has(kubernetes.io/hostname)` without narrowing the target to automatic HostEndpoints. Updated the policy selector to include `projectcalico.org/created-by == 'calico-kube-controllers'`, which targets the automatic HostEndpoints documented by Calico.
- The original source selector could match any endpoint with the hostname label. Updated it to match the trusted node's automatic HostEndpoint explicitly.
- The original rules matched destination ports without specifying `protocol: TCP`. Added `protocol: TCP` to each port-based rule to align with Calico policy examples and the services being restricted.
- The original testing notes implied that Calico policy alone would block SSH, etcd, and Kubernetes API ports. Calico default host failsafe rules commonly keep ports 22, 2379, 2380, and 6443 open on host endpoints, so the post now states that failsafe ports must be reviewed and adjusted before relying on the policy to restrict those ports.

## Review Notes
The example remains a simplified pattern. In a production cluster, operators should validate required node-to-node traffic such as kubelet, DNS, DHCP, BGP, overlay, and control-plane communication before changing host endpoint policy or host failsafe settings.
