# Validation Summary: How to Use BGP Communities with MetalLB

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- MetalLB
- Kubernetes Services and LoadBalancer IP allocation
- BGP
- BGP communities, large communities, and well-known communities
- Cisco IOS-XE routing policy
- Juniper Junos routing policy
- FRRouting (FRR)

## Sources Consulted
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB advanced BGP configuration: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB usage documentation for service annotations: https://metallb.universe.tf/usage/
- RFC 1997, BGP Communities Attribute: https://datatracker.ietf.org/doc/html/rfc1997
- RFC 8092, BGP Large Communities Attribute: https://datatracker.ietf.org/doc/html/rfc8092
- RFC 7999, BLACKHOLE Community: https://datatracker.ietf.org/doc/html/rfc7999
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS-XE BGP documentation: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-6/configuration_guide/rtng/b_176_rtng_9500_cg/configuring_bgp.html
- Juniper Junos community policy documentation: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/community-edit-policy-options.html

## Issues Found
- The post described creating a `BGPCommunity` resource and used `Community` resource names in `BGPAdvertisement.spec.communities`. MetalLB uses `kind: Community` to define aliases, and `BGPAdvertisement.spec.communities` must reference literal community values or alias names. Updated the explanation and all advertisement examples to use alias names such as `production`, `high-priority`, `prefer-us-path`, and `production-critical`.
- Several examples implied that referencing a `Community` resource attaches every alias in that resource. MetalLB does not work that way; each community value or alias must be listed explicitly. Updated the basic, combined, geographic, priority, and complete examples.
- `BGPPeer` examples used `metallb.io/v1beta1`. Current MetalLB API documentation lists `BGPPeer` under `metallb.io/v1beta2`. Updated all `BGPPeer` snippets.
- The service example used legacy `metallb.universe.tf/*` annotations. Current MetalLB documentation uses `metallb.io/address-pool` and `metallb.io/loadBalancerIPs`. Updated both annotations.
- The multi-homed failover section defined peers and communities but did not include advertisements binding the primary and backup communities to their peers. Added the missing IP pool and `BGPAdvertisement` examples.
- The Cisco IOS-XE snippet placed a global `ip route` under the BGP router configuration. Moved the null route to global configuration context before `router bgp`.
- The Junos and FRR large-community examples used wildcard syntax in places where exact large-community values are safer for the shown standard community/list forms. Replaced `4200000001:1:*` with `4200000001:1:100`.
- The introductory BGP community definition described all communities as 32-bit values. Updated the wording to distinguish standard communities from broader community attribute types.

## Review Notes
The post is technically relevant and valid after the corrections. Router-side examples remain illustrative and should still be adapted to the target platform version and local routing policy before production use.
