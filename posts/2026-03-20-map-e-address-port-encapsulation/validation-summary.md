# Validation Summary: How to Understand MAP-E (Mapping of Address and Port using Encapsulation)

## Status
validated

## Post Type
Guide

## Technologies Covered
- MAP-E
- MAP-T
- IPv4
- IPv6
- DHCPv6 Softwire46 options
- Linux `iproute2` tunnels
- NAT44 / `iptables`
- DS-Lite

## Sources Consulted
- RFC 7597, *Mapping of Address and Port with Encapsulation (MAP-E)*: https://www.rfc-editor.org/rfc/rfc7597
- RFC 7598, *DHCPv6 Options for Configuration of Softwire Address and Port-Mapped Clients*: https://www.rfc-editor.org/rfc/rfc7598
- RFC 7599, *Mapping of Address and Port using Translation (MAP-T)*: https://www.rfc-editor.org/rfc/rfc7599
- RFC 6145, *IP/ICMP Translation Algorithm*: https://www.rfc-editor.org/rfc/rfc6145
- Red Hat Enterprise Linux documentation, *Configuring IP tunnels* (for current IPIP6 terminology): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-ip-tunnels_configuring-and-managing-networking
- OpenWrt package metadata for `map` (evidence that MAP-E support is provided by MAP-aware software, not just a generic tunnel primitive): https://openwrt.org/packages/pkgdata/map
- Local system documentation checked against the current environment: `ip -6 tunnel help`, `ip-tunnel(8)`, `modinfo ip6_tunnel`, and `iptables -j SNAT -h`

## Issues Found
- The MAP-T comparison row claimed zero header overhead and no packet-size growth. I corrected this to reflect RFC 7599 and RFC 6145: MAP-T typically increases packet size by 20 bytes, or 28 bytes when an IPv6 Fragment Header is present.
- The post expanded `BR` as “Border Router”. RFC 7597 defines `BR` as “Border Relay”, so I corrected the term where it appeared.
- The stateless-operation section incorrectly implied that the CE always encodes the mapping in the IPv6 destination address. I corrected it to distinguish between traffic sent to the configured BR for outside destinations and direct CE-to-CE forwarding in mesh mode.
- The DHCPv6 rule example mixed MAP-E and MAP-T provisioning by including a Default Mapping Rule (DMR). RFC 7598 uses `OPTION_S46_RULE` and `OPTION_S46_BR` for MAP-E, while `OPTION_S46_DMR` is for MAP-T, so I removed the DMR example and replaced it with MAP-E-appropriate rule elements.
- Several example IPv6 literals were syntactically invalid, such as `2001:db8:map::/48` and `2001:db8:br::1`. I replaced them with valid documentation-style IPv6 addresses.
- The port-sharing arithmetic was incorrect. With a /24 IPv4 rule, 16 EA bits, and an 8-bit PSID, 256 subscribers share each IPv4 address, not 16. I also corrected the usable-port example to match the RFC 7597 generalized modulus algorithm rather than a single contiguous range.
- The Linux CLI example used `ip tunnel add ... mode ip4ip6`, which does not match current `iproute2` syntax. I corrected it to `ip -6 tunnel add ... mode ipip6`, aligned it with the current `ip-tunnel(8)` interface, and added the required IPv4 forwarding note for a CE router.
- The Linux section implied that a generic tunnel plus simple SNAT rules was a full MAP-E CE configuration. I corrected this by explicitly stating that MAP-aware address/PSID derivation and NAT44 port-set enforcement are still required.

## Review Notes
- The post is now technically sound as an explanatory guide, but the Linux section remains intentionally limited to the underlying IPv4-in-IPv6 tunnel mechanics. A production MAP-E CE usually relies on MAP-aware CPE firmware or dedicated software rather than bare `iproute2` plus ad hoc firewall rules.
- The commands were validated against current local CLI help and man pages, but not applied to a live test network in this review workspace.
