# Validation Summary: How to Peer BGP Over IPv6 Global Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- FRRouting (FRR)
- Cisco IOS / IOS XE
- OSPFv3

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS XE Routing Configuration Guide, "Implementing Multiprotocol BGP for IPv6": https://www.cisco.com/content/en/us/td/docs/switches/lan/catalyst9400/software/release/16-8/configuration_guide/rtng/b_168_rtng_9400_cg.pdf
- Cisco IOS BGP Command Reference, `neighbor activate`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco IOS BGP Command Reference, `neighbor update-source`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp4.html
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)": https://www.rfc-editor.org/rfc/rfc4271
- RFC 2545, "Use of BGP-4 Multiprotocol Extensions for IPv6 Inter-Domain Routing": https://www.rfc-editor.org/rfc/rfc2545.html
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291
- IANA IPv6 Address Space: https://www.iana.org/assignments/ipv6-address-space

## Issues Found
- Several example IPv6 addresses were syntactically invalid because they used non-hexadecimal text in hextets, such as `2001:db8:link::2`, `2001:db8:myprefix::/48`, `2001:db8:remote::peer`, and `2001:db8:peer::/48`. I replaced them with valid documentation-prefix examples under `2001:db8::/32` so the configs are parseable and standards-compliant.
- The iBGP example incorrectly used `neighbor 2001:db8::2 ebgp-multihop 2`. FRRouting documents `ebgp-multihop` for eBGP neighbors, so I removed that line from the iBGP section.
- The next-hop explanation was slightly too absolute for IPv6. I updated it to reflect RFC 2545 and RFC 4271: eBGP typically uses the advertising peer's global address as the next hop, and on a shared subnet a link-local next hop may also be included; iBGP preserves the received next hop unless `next-hop-self` is configured.

## Review Notes
- The `network` examples are syntactically correct, but actual route origination still depends on platform behavior and local routing state. Cisco IOS requires the prefix to exist in the IPv6 unicast routing table, and modern FRR defaults also require RIB presence via `bgp network import-check`.
