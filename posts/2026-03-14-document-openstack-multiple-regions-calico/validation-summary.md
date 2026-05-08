# Validation Summary: How to Document OpenStack Multiple Regions with Calico for Operations Teams

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- OpenStack
- Calico for OpenStack
- Calico BGP and route reflectors
- BIRD
- Bash
- OpenStackClient
- calicoctl

## Sources Consulted
- Calico OpenStack multiple regions documentation: https://docs.tigera.io/calico/latest/networking/openstack/multiple-regions
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack installation for Ubuntu: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico OpenStack verification guide: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/verification
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- OpenStackClient subnet command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/subnet.html

## Issues Found
- The post did not mention the Calico OpenStack multi-region model of a shared etcd datastore with per-region Calico namespaces. Added this to the operational context and reference table.
- The topology diagram used "IP Pool" terminology for OpenStack VM address ranges. Changed those labels to "VM Subnet" to match OpenStack/Neutron terminology.
- The verification script used Kubernetes datastore variables, per-region kubeconfigs, Calico IPPools, and BGPConfiguration resources. Replaced that with OpenStack subnet checks, etcdv3-backed Calico workload endpoint checks by OpenStack region namespace, and route-reflector BGP status checks.
- The incident response example referenced a `calico-bird` systemd unit. Calico OpenStack package documentation refers to BIRD directly, so the command now checks the `bird` unit.
- The troubleshooting note referred to IP pools changing. Updated it to refer to OpenStack subnet changes.

## Review Notes
The post remains a documentation and operations guide rather than an installation guide. The BGP topology examples are environment-specific and should be treated as examples to document, not universal Calico OpenStack defaults.
