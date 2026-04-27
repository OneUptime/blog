# Validation Summary: How to Configure IPv6 with OVS (Open vSwitch)

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Open vSwitch (OVS) — `ovs-vsctl`, `ovs-ofctl`, `ovs-appctl`, `ovs-dpctl`
- OpenFlow (IPv6 match fields)
- VXLAN with IPv6 underlay
- Geneve with IPv6 underlay
- VLAN tagging and trunking on OVS
- OVS patch ports
- ICMPv6 / NDP (Neighbor Discovery Protocol)
- OpenStack Neutron (neutron-openvswitch-agent, ML2 plugin)
- OVN (Open Virtual Network) — `ovn-nbctl`
- Linux iproute2 (`ip -6`)
- tcpdump

## Sources Consulted
- Open vSwitch documentation: https://docs.openvswitch.org/
- ovs-vsctl(8) man page: https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.html
- ovs-ofctl(8) man page: https://www.openvswitch.org/support/dist-docs/ovs-ofctl.8.html
- ovs-fields(7) man page (OpenFlow match fields including `ipv6`, `icmp6`, `icmpv6_type`, `ipv6_src`, `ipv6_dst`): https://www.openvswitch.org/support/dist-docs/ovs-fields.7.html
- OVS tunnel documentation (IPv6 underlay support for VXLAN/Geneve): https://docs.openvswitch.org/en/latest/howto/tunneling/
- RFC 4861 (Neighbor Discovery for IPv6) — ICMPv6 type 134 (RA), 135 (NS), 136 (NA)
- RFC 7348 (VXLAN), RFC 8926 (Geneve)
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- OpenStack Neutron OVS agent docs / ml2_conf.ini reference
- ovn-nbctl(8) man page: https://www.ovn.org/support/dist-docs/ovn-nbctl.8.html

## Issues Found
No technical issues found.

All commands, flags, and configuration snippets verified correct:
- `ovs-vsctl add-br`, `add-port`, inline Port column setting (e.g., `tag=100`, `vlan_mode=trunk`, `trunks=100,200,300`), and the `--` separator for chained commands match the ovs-vsctl syntax.
- VXLAN/Geneve interface options `type=vxlan|geneve`, `options:remote_ip`, `options:local_ip`, `options:key` accept IPv6 addresses (supported in OVS since 2.6).
- OpenFlow match shortcuts `ipv6` and `icmp6` (which expand to `eth_type=0x86dd` and `eth_type=0x86dd,ip_proto=58` respectively) are valid; `icmpv6_type`, `ipv6_src`, `ipv6_dst` are correct field names.
- ICMPv6 NDP type values 134 (RA) and 135 (NS) are accurate per RFC 4861.
- Neutron `[ovs]` section with `local_ip` (IPv6 address) and `tunnel_types = vxlan` is the correct config for IPv6 VXLAN tunnel endpoints.
- OVN commands `lr-list`, `ls-list`, `lsp-list`, `lr-route-list` are all valid `ovn-nbctl` subcommands.
- `ovs-appctl ofproto/trace` syntax with quoted flow spec is correct.

## Review Notes
- The IPv6 documentation prefix `2001:db8::/32` is used appropriately throughout.
- The tutorial doesn't explicitly bring the `ovs-br0` interface up with `ip link set ovs-br0 up`, but OVS internal bridge interfaces are typically activated automatically when an address is assigned, so this is acceptable.
- VXLAN over IPv6 underlay requires OVS 2.6+ and a kernel with IPv6 VXLAN support; readers on very old distributions may hit issues, but this is increasingly rare in 2026.
- The Geneve note "preferred over VXLAN for extensibility" reflects a common design viewpoint (Geneve has variable-length TLV options vs. VXLAN's fixed VNI) and is reasonable.
- The `2001:db8:bad::/48` example prefix is a legal IPv6 prefix using only valid hex characters — fine for an "untrusted source" example.
- Worth noting in future updates: Neutron's tunnel endpoint IPv6 support requires a recent enough Neutron version; in older releases, only IPv4 endpoints were supported.
