# Validation Summary: Tune Calico on Self-Managed AWS Kubernetes for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- AWS EC2
- Amazon VPC route tables
- Calico IPPool resources
- Calico FelixConfiguration resources
- Calico BGP and BGPPeer resources

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance - https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: IP pool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Create multiple IP pools - https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico documentation: Determine best networking option - https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BGP peer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: calicoctl patch - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- AWS EC2 documentation: Network maximum transmission unit (MTU) for your EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- AWS VPC documentation: Create a route table for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/create-vpc-route-table.html

## Issues Found
- The post claimed EC2 instances have a default 9001-byte MTU and implied jumbo frames are generally usable within a VPC. Updated this to current-generation EC2 support for jumbo frames and added the caveat that usable MTU depends on the full traffic path.
- The MTU command used an invalid `FelixConfiguration` field, `vethMTU`. Replaced it with the documented operator `Installation.spec.calicoNetwork.mtu` patch and the manifest-based `calico-config` `veth_mtu` patch plus a `calico-node` restart.
- The direct-routing section implied Calico could use VPC routing automatically when pod CIDRs are advertised via BGP. Clarified that Calico CNI on AWS needs explicit VPC routes to node ENIs and disabled source/destination checks for non-overlay pod forwarding.
- The IPPool direct-routing example set `natOutgoing: true` while the best practices recommended disabling NAT for routed pod CIDRs. Updated the example to `natOutgoing: false` and added the return-path caveat for egress destinations outside the routed domain.
- The cross-AZ section used a Felix patch with `routeSource`, `useInternalDataplaneDriver`, and `iptablesRefreshInterval` to imply zone-aware route optimization. Replaced it with a Calico IPPool node-selector example, which matches documented topology-based IP assignment.
- The Felix tuning example included values that were either defaults or not directly related to AWS scale tuning. Simplified the example to documented refresh interval and IPv6 settings.
- The BGP route reflector example configured a single `peerIP` and described AZ-limited peering as cross-AZ route optimization. Replaced it with the documented `peerSelector` route-reflector pattern and clarified that route reflectors scale BGP sessions rather than programming AWS VPC routes.

## Review Notes
The guide is now technically valid as a high-level production tuning guide, but real AWS deployments still need environment-specific route management, security group rules, source/destination check handling, and MTU testing. For clusters that require pod IPs to be natively routable in AWS without manual route management, Calico's current networking guidance points to Amazon VPC CNI with Calico policy rather than Calico CNI.
