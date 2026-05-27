# Validation Summary: How to Check BGP Route Advertisements from MetalLB on Your Router

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- Cisco IOS / IOS-XE
- Juniper Junos OS
- MikroTik RouterOS
- VyOS
- FRRouting
- BIRD
- Linux routing

## Sources Consulted
- MetalLB BGP concepts and FRR/FRR-K8s backend documentation: https://metallb.io/concepts/bgp/
- MetalLB troubleshooting guide for BGP advertisement checks: https://metallb.io/troubleshooting/
- MetalLB release notes for current FRR-K8s default backend behavior: https://metallb.io/release-notes/
- FRRouting BGP command documentation: https://docs.frrouting.org/en/latest/bgp.html
- VyOS BGP operational command documentation: https://docs.vyos.io/en/latest/configuration/protocols/bgp.html
- Juniper `show bgp summary` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-bgp-summary.html
- Juniper `show route receive-protocol` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-receive-protocol.html
- Juniper `show route protocol` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-protocol.html
- MikroTik RouterOS BGP documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/331612228/routing%2Bbgp
- MikroTik RouterOS route table documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/59965493/routing%2Broute
- BIRD user guide remote-control command reference: https://bird.network.cz/doc/bird-4.html

## Issues Found
- The MetalLB-side examples only showed direct FRR `vtysh` commands, even though current MetalLB uses FRR-K8s as the default BGP backend. Added current FRR-K8s status checks with `servicebgpstatuses` and `bgpsessionstates`, and clarified that the `vtysh` examples apply to direct FRR mode with the `frr` container.
- The Junos example used `show route protocol bgp neighbor 10.0.1.10`, which is not valid Junos syntax. Replaced it with `show route protocol bgp` and kept the per-neighbor received-route check as `show route receive-protocol bgp 10.0.1.10`.
- The MikroTik RouterOS v7 section used `/routing/bgp/advertisements` for received routes. Updated the received-route inspection to `/routing/route/print detail where bgp`, which is the documented v7 route view for BGP attributes and peer-origin details.
- The VyOS section used raw FRR-style `show bgp ipv4 unicast neighbors ...` syntax. Updated it to VyOS-documented `show bgp ipv4 neighbors ...` syntax.
- The BIRD section suggested checking the export filter for routes received from MetalLB. Replaced it with `show route filtered protocol metallb_peer`, noting that it depends on `import keep filtered`.
- The Junos ECMP note used `set protocols bgp multipath multiple-as`, which is not the baseline command for same-AS ECMP. Updated it to `set protocols bgp multipath`.

## Review Notes
The post is technically relevant and remains current as a practical router-side verification guide. Some commands are still platform-version dependent, especially Cisco and FRR `received-routes` views and MikroTik peer identifiers, so operators may need to adapt syntax to their exact device software release.
