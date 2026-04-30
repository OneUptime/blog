# Validation Summary: How to Understand the Mobility Header in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Mobile IPv6 (MIPv6)
- IPv6 Mobility Header
- `tcpdump`
- Linux kernel IPv6 mobility support

## Sources Consulted
- RFC 6275, *Mobility Support in IPv6*: https://datatracker.ietf.org/doc/html/rfc6275
- RFC 6275 HTML/errata view: https://www.rfc-editor.org/rfc/rfc6275.html
- Local `pcap-filter(7)` manual for `ip6 protochain`
- Local `tcpdump --help` output
- Local Linux kernel source: `/usr/src/linux-hwe-6.17-headers-6.17.0-20/net/ipv6/Kconfig`
- Local module metadata: `modinfo mip6`

## Issues Found
- Replaced invalid example IPv6 addresses such as `2001:db8:home::phone` with valid documentation-prefix literals.
- Corrected the Binding Refresh Request description. RFC 6275 defines it as a correspondent-node-to-mobile-node message requesting the mobile node refresh or re-establish the binding, not a home-agent renewal message.
- Corrected the Binding Update flow description to distinguish the Binding Update itself from the Home Address destination option that carries the home address when registering with the home agent.
- Updated the Mobility Header `Payload Proto` description to match RFC 6275, which says implementations should set it to `IPPROTO_NONE` (`59`).
- Replaced the `tcpdump` capture filter `ip6[6] == 135` with `ip6 protochain 135`, because the former only checks the base IPv6 header and can miss Mobility Headers behind extension headers.
- Fixed the Linux verification command from `grep -i mobile /boot/config-$(uname -r)` to `grep '^CONFIG_IPV6_MIP6=' /boot/config-$(uname -r)`, which actually matches the kernel config symbol used for IPv6 mobility support.
- Corrected the deployment caveat about security: home registration requires IPsec with the home agent, while route optimization relies on the Return Routability procedure rather than requiring IPsec to correspondent nodes.
- Reworded the Linux support note to refer to the kernel `CONFIG_IPV6_MIP6` option and `mip6` module instead of attributing kernel support to the UMIP project.
- Narrowed the Linux/deployment wording so the post no longer implies every Linux environment includes MIPv6 support by default.

## Review Notes
- The kernel Kconfig help text on this system still references RFC 3775 for IPv6 mobility support, while RFC 6275 is the newer Mobile IPv6 specification that obsoletes RFC 3775.
