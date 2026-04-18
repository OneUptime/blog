# Validation Summary: How to Troubleshoot Multicast Not Working Across VLANs

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- IGMP (Internet Group Management Protocol) and IGMP snooping
- PIM (Protocol Independent Multicast) - sparse-dense-mode
- Cisco IOS multicast CLI (`show ip igmp snooping`, `show ip pim`, `show ip mroute`)
- Linux multicast tooling (`ip maddr`, Python `socket` IP_ADD_MEMBERSHIP)
- iptables FORWARD chain rules for multicast (224.0.0.0/4)
- tcpdump on VLAN subinterfaces (`eth0.10`, `eth0.20`)
- Mermaid diagrams

## Sources Consulted
- Cisco IOS IP Multicast Configuration Guide — IGMP snooping commands (`show ip igmp snooping`, `show ip igmp snooping querier`, `ip igmp snooping vlan <id> querier`, `ip igmp snooping vlan <id> querier address <ip>`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti_igmp/configuration/xe-16/imc-igmp-xe-16-book.html
- Cisco IOS PIM Configuration Guide (`ip pim sparse-dense-mode`, `show ip pim interface`, `show ip pim neighbor`, `show ip mroute`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipmulti_pim/configuration/xe-16/imc-pim-xe-16-book.html
- RFC 3376 — IGMPv3 (membership report/query behavior and querier role)
- RFC 4541 — Considerations for IGMP and MLD Snooping Switches (querier requirement for snooping)
- Linux kernel `ip maddr` (iproute2) man page
- Python `socket` documentation — `IP_ADD_MEMBERSHIP` and `struct ip_mreq` layout (group address + interface address): https://docs.python.org/3/library/socket.html
- iptables(8) man page — FORWARD chain and destination matching
- tcpdump(1) man page — interface and BPF filter syntax
- Mermaid docs — node label syntax and line breaks with `<br/>`: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- **Mermaid line breaks used `\n`** — Mermaid flowchart node labels use `<br/>` for line breaks, not `\n`. Depending on the renderer, `\n` may render literally. Changed `Multicast Source\nVLAN 10` and `L3 Switch / Router\nPIM enabled` to use `<br/>`, matching the convention used elsewhere in this blog.

All other content was verified as technically accurate:
- `ip maddr show dev eth0` is correct for listing multicast memberships.
- The Python `IP_ADD_MEMBERSHIP` snippet is correct — `ip_mreq` is two `in_addr` fields concatenated (group + interface), which `socket.inet_aton('239.1.2.3') + socket.inet_aton('0.0.0.0')` builds correctly.
- Cisco IGMP snooping / querier / PIM / mroute commands all match current IOS syntax.
- `ip pim sparse-dense-mode` is a valid Cisco PIM mode for SVIs.
- iptables rule allowing `-d 224.0.0.0/4` on FORWARD correctly matches the IPv4 multicast range.
- tcpdump VLAN subinterface syntax (`eth0.10`) and BPF `dst` filter are valid.

## Review Notes
- PIM sparse-dense-mode is legacy; modern deployments typically use PIM sparse-mode with an RP (static or Auto-RP/BSR) or PIM-SSM (`ip pim ssm default` / range) for 232.0.0.0/8. The post's recommendation still works on Cisco IOS but newer networks may prefer sparse-mode. Not a correctness issue.
- The post focuses on Cisco IOS syntax; readers on NX-OS, IOS-XR, Arista EOS, or Juniper Junos will need equivalent commands. This is fine given the scope.
- `iptables` is being superseded by `nftables` on modern distros; the example still works where the iptables-legacy or iptables-nft shim is available.
- The sample group `239.1.2.3` is in the IPv4 administratively-scoped range (239/8), which is appropriate for a lab/enterprise example.
- IGMPv3 source-specific joins (`IP_ADD_SOURCE_MEMBERSHIP`) are not covered; the ASM join shown is sufficient for the troubleshooting scope.
