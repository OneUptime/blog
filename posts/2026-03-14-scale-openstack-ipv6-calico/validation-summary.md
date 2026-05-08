# Validation Summary: How to Scale OpenStack IPv6 with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack Neutron
- Project Calico for OpenStack
- IPv6 and Neighbor Discovery Protocol
- Calico GlobalNetworkPolicy
- Calico BGPConfiguration and BGPPeer
- Linux sysctl networking parameters

## Sources Consulted
- Calico OpenStack IPv6 documentation: https://docs.tigera.io/calico/latest/networking/openstack/ipv6
- Calico OpenStack IP addressing and connectivity documentation: https://docs.tigera.io/calico/latest/networking/openstack/connectivity
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico BGPConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- OpenStack IPv6 networking documentation: https://docs.openstack.org/ocata/networking-guide/config-ipv6.html
- python-openstackclient network command documentation: https://docs.openstack.org/python-openstackclient/3.4.0/command-objects/network.html
- python-openstackclient subnet command documentation: https://files.openstack.org/docs/python-openstackclient/3.8.1/command-objects/subnet.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.15/networking/ip-sysctl.html

## Issues Found
- The post described OpenStack VM dual-stack setup as Calico IPPool creation. Calico's OpenStack documentation states that OpenStack controls whether VMs receive IPv4, IPv6, or both addresses, so the section was changed to create dual-stack Neutron subnets with `openstack network create` and `openstack subnet create`.
- The original `projectcalico.org/v3` `IPPool` examples used `encapsulation`, which is not a valid field for the Calico IPPool resource. Because the section was OpenStack-specific, the invalid IPPool YAML was replaced with Neutron subnet commands instead of converting it to Kubernetes Calico IPPool syntax.
- The BGP example used `serviceClusterIPs` and described it as enabling IPv4 and IPv6 address families. Calico documents `serviceClusterIPs` as Kubernetes Service CIDRs advertised over BGP, so the example was replaced with `BGPConfiguration` plus `BGPPeer` route-reflector/fabric peering configuration.
- The verification script checked Calico IP pools for OpenStack VM addressing. It now checks OpenStack IPv6 subnets and then verifies IPv6 routes and neighbor table size on compute nodes.
- The NDP tuning snippet persisted `net.ipv6.route.max_size`, which Linux kernel documentation marks as deprecated for IPv6 on kernels 6.3 and later. The persistent setting was removed and replaced with a version-specific note.
- The NDP tuning comment said the script reduced the retransmit timer while setting it to the common default of 1000 ms. The comment now says the timer is set explicitly.

## Review Notes
The Calico policy example is syntactically valid and uses the documented `ICMPv6` protocol value. Operators should still confirm that OpenStack workload endpoints have labels matching the policy selector before applying it.
