# Validation Summary: How to Design IPv6 Firewall Zones for Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and segmentation
- Linux `ip6tables` / netfilter firewalling
- ICMPv6 and Neighbor Discovery
- Data center network zoning
- Unique Local Addresses (ULA)

## Sources Consulted
- RFC 4291, *IPv6 Addressing Architecture*: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4193, *Unique Local IPv6 Unicast Addresses*: https://www.rfc-editor.org/rfc/rfc4193
- RFC 4443, *ICMPv6 for IPv6 Specification*: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, *Neighbor Discovery for IPv6*: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4864, *Local Network Protection for IPv6*: https://www.rfc-editor.org/rfc/rfc4864.html
- RFC 4890, *Recommendations for Filtering ICMPv6 Messages in Firewalls*: https://www.rfc-editor.org/rfc/rfc4890.html
- Netfilter iptables project documentation/history for the `state` to `conntrack` guidance: https://git.netfilter.org/iptables/commit/?h=v1.8.8&id=4c1a015e201c6e5192448cbcf1975dd7630cad82
- Local `ip6tables v1.8.10 (nf_tables)` `-h`, `-p icmpv6 -h`, and match help output to verify current CLI syntax

## Issues Found
- The opening explanation overstated IPv6 behavior by saying every device gets a globally routable address and implied NAT itself provides security. I corrected this to reflect that IPv6 was designed to avoid NAT and that end-to-end addressing is common, without treating NAT as the security control.
- The zone examples used inconsistent prefixes between the zone list and the addressing table. I aligned the DMZ and management examples with the documented `2001:db8:0::/48` example site layout.
- The firewall example used `-m state --state ...`, which is the older matcher. I updated the rules to use `-m conntrack --ctstate ...`, which is the current interface documented by netfilter and supported by current `ip6tables`.
- The forwarded policy was functionally incomplete because it allowed new forwarded connections but did not allow `ESTABLISHED,RELATED` traffic in the `FORWARD` chain. That would break return traffic for HTTPS and PostgreSQL. I added the missing `FORWARD` stateful accept rule.
- The rules used `-s ::/0` to represent “the internet.” That does not mean “external zone”; it matches every IPv6 source and would also shadow later internal-management rules. I replaced that logic with interface-based zone matching in the example.
- The management SSH rule targeted `2001:db8::/32`, which was broader than the example site prefix and inconsistent with the comment. I narrowed it to the example site `/48`.
- The ICMPv6 section incorrectly described Router Solicitation/Advertisement and Neighbor Solicitation/Advertisement as generic zone-boundary must-allow traffic. Per RFC 4861 and RFC 4890, those messages are link-local/local-link functions for interfaces where the firewall participates on the link. I corrected the text and commands accordingly.
- The management guidance said to use “ULA or a private /48,” but IPv6 does not define private GUA space analogous to RFC 1918. I corrected this to recommend ULA, noting the locally assigned `fd00::/8` usage within `fc00::/7`.

## Review Notes
- The post correctly uses `2001:db8::/32` documentation space for examples.
- The `ip6tables` syntax remains valid, but on many modern Linux systems it is implemented via the nftables backend rather than the legacy xtables backend.
