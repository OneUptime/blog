# Validation Summary: How to Plan IPv6 Addressing for VLANs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- VLANs and switched virtual interfaces (SVIs)
- Python `ipaddress`
- Cisco IOS-XE IPv6 interface configuration
- Linux `iproute2`
- `radvd`
- `ip6tables`

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421.html
- RFC 6164, Using 127-Bit IPv6 Prefixes on Inter-Router Links: https://www.rfc-editor.org/rfc/rfc6164
- Python Standard Library, `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Cisco IOS XE IPv6 unicast routing guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-18/configuration_guide/rtng/b_1718_rtng_9400_cg/configuring_ipv6_unicast_routing.html
- Cisco IOS IPv6 command reference (`ipv6 nd ra interval`, `ipv6 nd advertisement-interval`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco VLAN configuration guide (VLAN ID range 1-4094): https://www.cisco.com/c/en/us/td/docs/routers/7600/ios/15S/configuration/guide/7600_15_0s_book/vlans.html
- `radvd.conf(5)` reference: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- `radvd` project site: https://radvd.litech.org/
- Local command help checked in this environment: `ip link`, `ip address`, `ip6tables --help`

## Issues Found
- The post used literal examples such as `2001:db8:site1::/48` and `2001:db8:site::/64`, which are not valid IPv6 addresses because each hextet must be hexadecimal. I replaced them with valid documentation addresses under `2001:db8::/32` by using `2001:db8:1::/48`, per RFC 3849.
- The Python example accepted VLAN IDs up to `65535`, which does not match the valid IEEE 802.1Q VLAN ID range used in the post. I corrected the validation to `1-4094`.
- The Python example would fail as written because the sample prefix string was invalid. I updated the sample prefix and changed the subnet construction to directly calculate the `/64` from the `/48` and VLAN ID.
- The Cisco IOS-XE example used `ipv6 nd ra-interval`, but Cisco documents `ipv6 nd ra interval` as the IOS/XE command and notes that it replaces the hyphenated form in this command family. I updated the configuration snippet accordingly.
- The prose said every VLAN needs a `/64`, but the post later recommends `/127` for point-to-point transit links. I clarified the text so `/64` applies to host-facing VLANs and `/127` applies to dedicated inter-router point-to-point links.
- The line `Convention for non-host VLANs:` was inaccurate because the same section also classified user and guest VLANs. I adjusted the label so the section matches its actual content.

## Review Notes
- The Linux `iproute2`, `radvd`, and `ip6tables` examples are syntactically valid after the address fixes.
- Many current Linux distributions prefer `nftables`, but `ip6tables` remains valid through the `nf_tables` compatibility frontend.
