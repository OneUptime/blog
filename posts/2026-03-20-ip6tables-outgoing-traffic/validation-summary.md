# Validation Summary: How to Write ip6tables Rules for Outgoing IPv6 Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- `ip6tables`
- `iptables`
- IPv6
- ICMPv6
- Linux netfilter
- Connection tracking (`conntrack`)

## Sources Consulted
- Netfilter `iptables` project overview: https://www.netfilter.org/projects/iptables/index.html
- Netfilter `iptables` man page: https://ipset.netfilter.org/iptables.man.html
- Netfilter `iptables-extensions` man page: https://ipset.netfilter.org/iptables-extensions.man.html
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using
- NIST Internet Time Service server list: https://tf.nist.gov/tf-cgi/servers.cgi/en-en/
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4443, ICMPv6 for IPv6 Specification: https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4380, Teredo: Tunneling IPv6 over UDP through NATs: https://www.rfc-editor.org/rfc/rfc4380
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- Local CLI validation: `ip6tables --version`, `ip6tables -p icmpv6 -h`, and `ip6tables-translate` on the installed `iptables v1.8.10 (nf_tables)` toolchain

## Issues Found
- Replaced invalid IPv6 example literals such as `2001:db8::mailserver`, `2001:db8:corp::/48`, `2001:db8:server::10`, `2001:db8:prod::/48`, and `fd00:mgmt::/48`. Under RFC 4291, IPv6 text fields must be hexadecimal, so those examples were not valid addresses.
- Corrected the anti-spoofing section. The original `OUTPUT`-chain `ACCEPT` rules would have allowed any outbound traffic from those source ranges and could bypass later service-specific restrictions. I changed the example to a dedicated `OUTPUT-SPOOF-CHECK` chain that returns for legitimate sources and logs/drops the rest.
- Fixed the full restrictive example's anti-spoof rule. The original rule used multiple `-s` matches in a single command, which `ip6tables` rejects. I replaced it with valid per-source rules in the dedicated anti-spoof chain.
- Removed the `fe80::/10` source restriction from Neighbor Solicitation and Neighbor Advertisement in the restrictive example. RFC 4861 allows Neighbor Solicitation to use the unspecified source address during Duplicate Address Detection, so the original rule was too narrow.
- Added TCP/53 rules alongside UDP/53 in the DNS allowlists. DNS can legitimately use TCP fallback, so allowing only UDP would break some valid resolver traffic. I also added the missing TCP rule for the second Google Public DNS resolver.
- Updated the `ESTABLISHED,RELATED` comment to reflect what the rule actually matches in the `OUTPUT` chain: packets belonging to existing or related connections, not only replies to inbound requests.

## Review Notes
- The post is technically valid after correction, and the examples now parse cleanly against the locally installed `ip6tables` frontend.
- The local environment uses the `nf_tables` backend (`ip6tables v1.8.10 (nf_tables)`), which means the article's `ip6tables` syntax remains current on modern Linux systems even when nftables is the underlying implementation.
- The post is intentionally scoped to `OUTPUT` rules. A production firewall with restrictive policy still needs corresponding `INPUT` rules for return traffic and any required inbound IPv6 control traffic.
