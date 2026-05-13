# Validation Summary: How to Configure Host Protection with Calico Host Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint resources
- Calico GlobalNetworkPolicy resources
- calicoctl
- kubectl
- Linux iptables dataplane

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico forwarded host endpoint policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico protect hosts and VMs guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- Calico protect Kubernetes nodes guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The GlobalNetworkPolicy ingress rule matched destination ports without specifying a protocol. Calico examples and policy semantics use a protocol match such as `TCP` when matching TCP ports, so `protocol: TCP` was added to the ingress allow rule for ports 22, 443, and 6443.
- The implementation sequence created the HostEndpoint before applying the policy. Calico denies traffic to and from a host endpoint by default when policy is not in place, except failsafe traffic, so the commands were reordered to apply the host protection policy before creating the HostEndpoint.
- The operational iptables command was phrased as viewing policy decisions generally. It only applies to the iptables dataplane, so the comment was narrowed to "View Calico iptables chains (iptables dataplane)."
- The Felix status command used `calico-node -felix-live` without the documented container path or container selection. It was updated to execute `/bin/calico-node -felix-ready` in the `calico-node` container, matching the documented readiness endpoint form.

## Review Notes
- The sample remains intentionally generic. Real production use should adjust node names, interface names, expected IPs, management CIDRs, Kubernetes control-plane ports, failsafe settings, and whether forwarded traffic should be governed by `applyOnForward: true`.
- The `calicoctl` commands are valid, but clusters installed primarily through Kubernetes CRDs may also expose resources through `kubectl` depending on installation and RBAC.
