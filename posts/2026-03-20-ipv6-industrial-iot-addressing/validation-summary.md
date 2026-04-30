# Validation Summary: How to Plan IPv6 Addressing for Industrial IoT

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and text representation
- Industrial IoT / OT network segmentation
- Purdue Model
- DHCPv6 with ISC DHCP
- Linux `ip6tables` / Netfilter
- DNS AAAA records
- Industrial application ports and service mappings

## Sources Consulted
- RFC 3849, IPv6 Documentation Address: https://www.rfc-editor.org/rfc/rfc3849
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- Local CLI documentation: `ip6tables --help`, `ip6tables -m conntrack -h`, `ip6tables -p tcp -h`, `ip6tables -p ipv6-icmp -h`, `ip6tables-translate`

## Issues Found
1. **Invalid IPv6 example literals and prefixes**: The post used symbolic hextets such as `industrial`, `plc`, `press`, `temp`, `scada`, `hmi`, and `dns`, and also used invalid prefix notation like `::4:0::/64`. I replaced them with valid hexadecimal documentation addresses under `2001:db8::/32` and corrected the prefix notation to RFC-compliant `/64` examples.

2. **DHCPv6 examples used invalid fixed addresses**: The `fixed-address6` examples and the DHCPv6 DNS server address were not valid IPv6 literals. I changed them to numeric IPv6 addresses while preserving the structure of the example and verified the `host-identifier`, `fixed-address6`, `range6`, `dhcp6.name-servers`, and `dhcp6.domain-search` syntax against ISC DHCP documentation.

3. **Firewall example had rule-order and policy inconsistencies**: The original `ip6tables` example used the legacy `state` matcher, allowed all forwarded ICMPv6 traffic, and mixed directional rules in a way that conflicted with the later protocol-specific examples. I changed the state tracking example to `conntrack`, narrowed ICMPv6 to essential transit/error traffic consistent with RFC 4890, and rewrote the adjacent-level policy so the default `DROP` policy enforces segmentation without unreachable later rules.

4. **Protocol-specific rules conflicted with the stated segmentation model**: The original MQTT example allowed Level 1 to talk directly to Level 3, which bypassed Level 2 and contradicted the post's own "adjacent levels only" rule. I changed it to an adjacent Level 2 to Level 3 flow and clarified that the port-specific rules are examples to use in place of the broader adjacent-level `ACCEPT` rules.

5. **Port example labels were looser than the authoritative registry data**: I updated the inline comments for ports `44818`, `502`, `4840`, and `8883` to match the corresponding IANA service descriptions more closely instead of making broader product/protocol capability claims than the cited sources support.

6. **Conclusion overstated how critical devices were assigned**: The original conclusion said critical PLCs and RTUs used static DHCPv6 reservations, but the body of the post showed both direct addressing examples and DHCPv6 reservations for field devices. I corrected the wording to "static IPv6 assignments or DHCPv6 reservations" so it matches the actual examples.

## Review Notes
- The post now uses `2001:db8::/32`, which is the RFC-reserved documentation prefix and should not be deployed in production.
- A single `/64` per Purdue level is acceptable for a compact example, but real OT environments often require multiple `/64` subnets per level because a Purdue level can span multiple routed segments or VLANs.
- The `ip6tables` append rules were parser-validated locally with `ip6tables-translate`. `ip6tables-restore --test` could not be completed in this environment because it requires elevated privileges.
