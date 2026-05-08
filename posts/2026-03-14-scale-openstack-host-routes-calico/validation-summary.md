# Validation Summary: How to Scale OpenStack Host Routes with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack
- Calico Open Source
- Calico IPPool, BGPConfiguration, BGPPeer, and Node resources
- BIRD BGP routing
- Linux routing and neighbor table sysctls
- OpenStackClient, calicoctl, and iproute2 commands

## Sources Consulted
- Calico OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering and route reflector guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.4/networking/ip-sysctl.html
- OpenStackClient compute service command reference: https://files.openstack.org/docs/python-openstackclient/latest/cli/command-objects/compute-service.html

## Issues Found
- The IPPool comments implied that a `blockSize` of `26` was an example of a larger block. Updated the wording to clarify that less-specific blocks, such as `/24`, reduce route count, and that `blockSize` is configured when creating new pools.
- The BGPConfiguration example described `prefixAdvertisements` as controlling which routes are advertised. Updated the comment because Calico documents this field as per-prefix advertisement properties, such as BGP communities.
- The BGPConfiguration example included `nodeMeshMaxRestartTime` while disabling the node-to-node mesh and described it like a general keepalive or hold timer. Removed it from the route-reflector example because Calico documents it as the graceful restart time announced by BIRD for full-mesh configurations.
- The route-reflector BGPPeer example only peered route reflectors with route reflectors, which would not provide replacement peerings for all nodes after disabling the full mesh. Updated it to use `nodeSelector: all()` with `peerSelector: route-reflector == 'true'`, matching Calico's documented route-reflector pattern.
- The kernel tuning section recommended `net.ipv4.route.max_size` and `/proc/net/rt_cache`. Updated the section and troubleshooting guidance because modern Linux kernels no longer use the old IPv4 route cache, making those tuning points obsolete for current deployments.
- The conclusion still referred to kernel route table parameters after the obsolete route-cache tuning was removed. Updated it to refer to neighbor table parameters.

## Review Notes
The examples are generally version-neutral but assume Calico deployments that use BGP/BIRD rather than overlay-only routing. The route count thresholds remain illustrative and should be tuned per deployment size and expected workload density.
