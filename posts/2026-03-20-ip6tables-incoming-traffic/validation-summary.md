# Validation Summary: How to Write ip6tables Rules for Incoming IPv6 Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ip6tables
- Linux netfilter/conntrack
- ICMPv6 / Neighbor Discovery Protocol

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/html/rfc4890
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Local CLI help from `ip6tables v1.8.10 (nf_tables)`: `ip6tables --help`, `ip6tables -m conntrack -h`, `ip6tables -m recent -h`, `ip6tables -m limit -h`, `ip6tables -p tcp -h`, `ip6tables -p icmpv6 -h`
- Local syntax checks with `ip6tables-restore --test` and `ip6tables-restore-translate -f`

## Issues Found
- The post used invalid IPv6 examples: `fd00:mgmt::/48` and `2001:db8:app::/64` are not valid IPv6 prefixes, so I replaced them with valid examples.
- The post claimed NDP traffic should come only from link-local sources and enforced `fe80::/10` on types 133-136. Per RFC 4861, Router Advertisements must be link-local, but Neighbor Solicitations and Neighbor Advertisements can use other valid source addresses, including `::` during Duplicate Address Detection. I corrected the rules and the summary text.
- The post labeled the ICMPv6 set as a RFC 4890 “MUST allow” set even though the listed rules were only a subset of RFC 4890 recommendations. I removed that overstatement and kept the section technically accurate.
- The SSH examples mixed alternative rules in a way that could mislead readers into combining them. I clarified the comments and aligned the rate-limited example with the restricted-source example.
- The HTTP section showed an unconditional port 80 accept before a port 80 rate-limit example, which would make the later rate-limit rules ineffective. I removed the unconditional HTTP accept from that example block.
- The mail section said port 587 was “from authorized users only,” but the firewall rule itself did not enforce user authorization. I corrected the comment to reflect that authentication is handled by the mail server.
- The post said it was blocking a specific IPv6 address but used a `/48` prefix. I changed the example to a single `/128` address.
- The generic source-drop examples included `::/128` and `fc00::/7`. Dropping `::/128` generically can interfere with legitimate Duplicate Address Detection traffic, and `fc00::/7` is a valid Unique Local Address range rather than a generic bogon. I removed those from the generic examples and template.
- The `::1/128` top-of-chain drop example could conflict with legitimate loopback traffic if inserted before the loopback allow rule. I scoped that example to non-loopback interfaces.

## Review Notes
- The local environment reports `ip6tables v1.8.10 (nf_tables)`, which means `ip6tables` is acting as a frontend to the nftables backend. The commands in the post are still valid, but native `nft` rules are often preferred for new deployments.
- The ICMPv6 echo-request rate-limit example is syntactically valid, but it is a policy choice and can affect diagnostics depending on the host role.
