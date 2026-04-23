# Validation Summary: How to Perform Router Advertisement Spoofing in Lab Environments

## Status
validated

## Post Type
Technical security testing guide

## Technologies Covered
- IPv6 Neighbor Discovery
- Router Advertisement (RA)
- SLAAC
- RDNSS
- RA Guard
- THC-IPv6 (`fake_router6`, `kill_router6`)
- SI6 Networks IPv6 Toolkit (`ra6`)
- Scapy
- ip6tables
- tcpdump

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4191, Default Router Preferences and More-Specific Routes: https://datatracker.ietf.org/doc/html/rfc4191
- RFC 6105, IPv6 Router Advertisement Guard: https://datatracker.ietf.org/doc/html/rfc6105
- RFC 6980, Security Implications of IPv6 Fragmentation with IPv6 Neighbor Discovery: https://datatracker.ietf.org/doc/html/rfc6980
- RFC 7113, Implementation Advice for IPv6 Router Advertisement Guard: https://datatracker.ietf.org/doc/html/rfc7113
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106
- THC-IPv6 `fake_router6` man page: https://www.mankier.com/8/fake_router6
- THC-IPv6 source for `fake_router6` and `kill_router6`: https://github.com/vanhauser-thc/thc-ipv6
- SI6 Networks IPv6 Toolkit overview: https://www.si6networks.com/research/tools/ipv6toolkit/
- `ra6` man page: https://manpages.debian.org/unstable/ipv6toolkit/ra6.1.en.html
- Scapy IPv6 layer API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- iptables extensions man page: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The examples used invalid IPv6 placeholders such as `2001:db8:attacker::/64`, `fe80::attacker`, and `2001:db8::evil-dns`. Replaced them with valid documentation-prefix addresses such as `2001:db8:dead:beef::/64`, `fe80::1234`, and `2001:db8::53`.
- The `fake_router6 -H` example described `-H` as high router preference, but current THC-IPv6 documentation defines `-H` as adding a hop-by-hop header. Updated the comment to match the actual option behavior.
- The `fake_router6 eth0 ::/0 0` example attempted to use `fake_router6` to send zero-lifetime RAs, but `fake_router6` does not take a router-lifetime argument. Replaced it with the THC-IPv6 `kill_router6 eth0 '*'` helper, which is the intended zero-lifetime RA tool.
- The `ra6` examples used unsupported options `--router-lifetime` and `--rdnss`. Updated them to `--lifetime` and `-N lifetime#address`, and used the documented prefix option format.
- The RA Guard bypass commands omitted required arguments for `--frag-hdr` and used the unsupported `--hbh-opt` option. Added valid size arguments and changed the hop-by-hop command to `--hbh-opt-hdr`.
- The fragmentation bypass wording did not mention RFC 6980 behavior. Added a short caveat that modern RFC 6980-compliant hosts should ignore fragmented Neighbor Discovery packets.
- The ip6tables defense text overclaimed that the sample rule blocked unsolicited RAs. Updated it to state that the rule drops RAs failing the required hop-limit check and added a caveat that on-link rogue RAs require RA Guard or source allow-lists.
- The RA Guard defense table cited only RFC 6105. Updated it to include RFC 7113 implementation guidance.

## Review Notes
The tcpdump filter shown is suitable for ordinary Router Advertisement packets without IPv6 extension headers. Future revisions could add a note or alternate capture method for extension-header test cases, but the existing command remains valid for standard RA monitoring.
