# Validation Summary: How to Configure OpenStack Multiple Regions with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenStack
- Calico for OpenStack
- Calico IPPool resources
- Calico BGPPeer resources
- Calico BGPConfiguration resources
- Calico GlobalNetworkPolicy resources
- BGP routing
- calicoctl
- Bash

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico OpenStack IP addressing and connectivity: https://docs.tigera.io/calico/latest/networking/openstack/connectivity
- Calico OpenStack component configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico outgoing NAT guide: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl etcd configuration reference: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd

## Issues Found
- The IPPool examples used `encapsulation: VXLAN`, which is an operator Installation IP pool field, not a valid `projectcalico.org/v3` IPPool field. Removed it from the IPPool resources.
- The IPPool examples enabled `natOutgoing`, which would masquerade traffic to destinations outside the local region's known Calico IP pools. Changed `natOutgoing` to `false` for routed cross-region CIDRs and added a note about disabled remote pools if NAT is enabled for other egress.
- The `calicoctl` examples used `DATASTORE_TYPE=kubernetes` and `KUBECONFIG`, but Calico for OpenStack uses an etcd datastore and `calicoctl` is required for non-Kubernetes platforms. Updated commands and scripts to use per-region `calicoctl.cfg` files with `--config`.
- The BGPConfiguration example used `prefixAdvertisements` as if it advertised the VM CIDR. Calico uses that field for per-prefix advertisement properties such as communities; IPPool routes are exported by default unless disabled. Removed the misleading `prefixAdvertisements` block.
- The GlobalNetworkPolicy rule combined remote CIDRs with `source.selector: role == 'web'`. In independent regional datastores, selectors do not match remote workload endpoint labels. Removed the source selector and kept the CIDR match.
- The troubleshooting section said Calico policies can prefer local traffic. Calico network policy controls allowed traffic, not routing preference. Updated the note to use application routing or service discovery for locality and Calico policy for enforcement.
- Quoted shell variables in the policy application script to avoid path-splitting issues.

## Review Notes
The post is technically relevant and contains implementation details, so it was reviewed as a code/configuration guide. The corrected examples are still high-level and assume each region's Calico/OpenStack deployment, route reflectors, external gateways, and BGP route export are already configured consistently. Future revisions could add explicit examples for no-NAT disabled remote IP pools and gateway/router configuration, but those are outside the current post's scope.
