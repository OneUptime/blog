# Validation Summary: How to Pass IPv6 Traffic Through Virtual Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6 / Neighbor Discovery Protocol (NDP)
- MLD
- Path MTU Discovery (PMTUD)
- Linux bridge / br_netfilter / ip6tables
- Open vSwitch (OVS) / OpenFlow
- VMware vSphere Standard vSwitch / ESXi `esxcli`
- Microsoft Hyper-V / PowerShell

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 8201, Path MTU Discovery for IP version 6: https://datatracker.ietf.org/doc/html/rfc8201
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Linux kernel bridge documentation: https://docs.kernel.org/networking/bridge.html
- Open vSwitch `ovs-ofctl(8)` manual: https://www.openvswitch.org/support/dist-docs/ovs-ofctl.8.html
- Open vSwitch `ovs-fields(7)` manual: https://www.openvswitch.org/support/dist-docs/ovs-fields.7.pdf
- Open vSwitch FAQ, OpenFlow versions and `ovs-ofctl` defaults: https://docs.openvswitch.org/en/stable/faq/openflow/
- Open vSwitch tracing documentation: https://docs.openvswitch.org/en/latest/topics/tracing/
- Broadcom ESXCLI command reference (`network vswitch standard policy security get`): https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html
- Broadcom knowledge base on VMware MAC Address Changes and Forged Transmits: https://knowledge.broadcom.com/external/article/427110/forged-transmits-and-mac-address-changes.html
- Broadcom knowledge base on directionality of MAC Address Changes vs Forged Transmits: https://knowledge.broadcom.com/external/article/321612/hcxneconsiderations-of-mac-address-chang.html
- Microsoft Learn, `Set-VMNetworkAdapter`: https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmnetworkadapter?view=windowsserver2025-ps
- Microsoft Learn, nested virtualization networking / MAC spoofing: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/enable-nested-virtualization

## Issues Found
- The MLD coverage was incomplete and inconsistent. The overview box omitted ICMPv6 type 130, and the OVS rule example allowed types 130 and 143 but not 131 and 132. I corrected the overview and OVS examples to cover MLDv1 and MLDv2 message types consistently.
- The OVS flow examples used `icmpv6_type` matches without accounting for Open vSwitch protocol requirements. Official OVS docs state `ovs-ofctl` enables only OpenFlow 1.0 by default, while `icmpv6_type` requires OpenFlow 1.2 or later. I added the bridge protocol setup and changed the `ovs-ofctl` commands to use `-O OpenFlow13`.
- The OVS trace example used `icmpv6` as a flow shorthand. OVS flow syntax documents `icmp6` for ICMPv6 matches. I corrected the trace example to use `icmp6`.
- The Linux bridge firewall example used generic `-i br0 -o br0` matching. Kernel bridge documentation identifies bridge-aware matching via `physdev` as the reliable way to distinguish bridged packets in ip6tables rules. I updated the rules to use `-m physdev --physdev-is-bridged` and replaced the older `state` match with `conntrack`.
- The VMware note on `MAC Address Changes` said it “may affect NDP in some setups,” which was too vague and slightly misleading. Broadcom documents this policy in terms of guests changing their effective MAC and receiving traffic for it. I revised the wording to match the documented behavior.
- The testing section overstated expected outcomes. Router Advertisements are not always sent to `ff02::1`, neighbor entries are not guaranteed to remain in `REACHABLE`, and a large-packet ping failure is not proof by itself that PMTUD is broken. I softened those statements to accurate, test-oriented guidance.

## Review Notes
- Linux kernel documentation now describes `br_netfilter` as a legacy feature and discourages its use when nftables can be used instead. The post remains valid because it limits the ip6tables example to environments that explicitly use bridge netfilter.
- The OVS examples assume a bridge operating in a mode where `actions=normal` is appropriate. That is correct for a switching-style bridge, but environments with a fully custom OpenFlow pipeline may need different forwarding actions.
