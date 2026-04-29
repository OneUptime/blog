# Validation Summary: How to Troubleshoot IS-IS IPv6 Adjacency Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- IS-IS
- IPv6
- Cisco IOS / IOS XE
- FRRouting (FRR)
- Junos OS
- tcpdump / libpcap filters
- tshark / Wireshark

## Sources Consulted
- RFC 1195, Use of OSI IS-IS for routing in TCP/IP and dual environments: https://datatracker.ietf.org/doc/html/rfc1195
- Cisco IOS XE IP Routing: ISIS Configuration Guide, "IPv6 Routing: IS-IS Support for IPv6": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/configuration/xe-3s/irs-xe-3s-book/ip6-route-isis-xe.html
- Cisco IOS ISO CLNS Command Reference, `show clns protocol`: https://www.cisco.com/c/en/us/td/docs/ios/isoclns/command/reference/iso_book/iso_m1.html
- Cisco IOS IP Routing: ISIS Command Reference, `show isis neighbors`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/command/irs-cr-book/irs-l1.html
- Cisco support docs, "IS-IS Hello Padding Behavior": https://www.cisco.com/c/en/us/support/docs/ip/integrated-intermediate-system-to-intermediate-system-is-is/119399-technote-isis-00.html
- Cisco support docs, "MTU Mismatch Problem in IS-IS": https://www.cisco.com/c/en/us/support/docs/ip/integrated-intermediate-system-to-intermediate-system-is-is/47201-isis-mtu.html
- FRRouting IS-IS documentation: https://docs.frrouting.org/en/stable-8.0/isisd.html
- Juniper IS-IS Overview: https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/is-is-routing-overview.html
- Juniper `interface` statement for IS-IS: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/interface-edit-protocols-isis.html
- pcap-filter(7): https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Wireshark display filter reference for IS-IS: https://www.wireshark.org/docs/dfref/i/isis.html

## Issues Found
- The Cisco interface command in Step 2 was incomplete. `ipv6 router isis` requires a process tag such as `ipv6 router isis area2`, so the example was corrected.
- The Cisco verification command in Step 3 was incorrect. `show isis protocols` is not the right IOS command for checking IS-IS level information; it was corrected to `show clns protocol`.
- The explanation in Step 3 was too strict. IS-IS neighbors do not need identical level settings; they need at least one common level. The text was updated to reflect that an L1-L2 router can peer with an L1-only or L2-only router.
- The authentication check in Step 5 was too narrow because it assumed key-chain-based authentication. The guidance was corrected to verify the actual interface authentication settings and configured secret on both peers.
- The MTU remediation in Step 6 was incorrect. `isis lsp-mtu` changes LSP sizing, not Hello padding behavior during adjacency formation. The guidance was corrected to focus on Hello padding and the interface command `no isis hello padding always`.
- The Junos configuration example in Step 7 used invalid `set` syntax. Junos requires `set interfaces ge-0/0/0 unit 0 family iso`, so the example was corrected.
- The `tcpdump` capture filter in Step 8 was incorrect. IS-IS should be matched with the libpcap `isis` filter rather than `ether proto 0x8870`, so the command was corrected.
- The troubleshooting matrix and summary were updated to stay consistent with the corrected commands and protocol behavior.

## Review Notes
- The FRRouting command example `vtysh -c "show isis neighbor"` is valid.
- Level-1 area matching and Junos `family iso` requirements were technically correct after cross-checking.
- Cisco single-topology IPv6 deployments perform protocol-support consistency checks by default, which is why missing `ipv6 router isis <tag>` on one side can affect adjacency in this scenario.
