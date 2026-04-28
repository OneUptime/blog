# Validation Summary: How to Configure nftables for IPv6 Firewalling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (Linux netfilter framework)
- ip6tables (predecessor, used for comparison)
- IPv6 (addressing, ICMPv6, NDP, extension headers)
- Linux kernel netfilter (filter hooks, conntrack)
- systemd (`systemctl` for service management)

## Sources Consulted
- [nftables wiki — Matching packet headers](https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers)
- [nftables wiki — Quick reference](https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes)
- [nft(8) Debian testing manpage](https://manpages.debian.org/testing/nftables/nft.8.en.html)
- [nftables(8) Debian testing manpage](https://manpages.debian.org/testing/nftables/nftables.8.en.html)
- [Netfilter nft manpage](https://www.netfilter.org/projects/nftables/manpage.html)
- [RFC 4193 — Unique Local IPv6 Unicast Addresses (fc00::/7, fd00::/8)](https://tools.ietf.org/html/rfc4193)
- Linux kernel changelog (nftables in 3.13; netdev egress hook in 5.16)

## Issues Found

1. **Invalid IPv6 literal `fd00:mgmt::/48`** in the SSH allow rule. The token `mgmt` is not valid hexadecimal, so `nft -f` would refuse to parse the file. Replaced with a valid example prefix `fd00:abcd:1::/48`.

2. **Unreachable SSH rule due to bogon ordering.** The bogon drop list included `fc00::/7` (the entire ULA range, of which `fd00::/8` is a subset), and the SSH-from-management-network rule (using a `fd00:...` ULA prefix) sat *after* the bogon rule, so management traffic would be dropped before the accept could ever match. Fixed by moving the SSH allow rule above the bogon drop, and removing `fc00::/7` from the bogon set since ULA is a legitimate private-use range, not a bogon, when you actually use it internally.

3. **`frag exists` is not valid syntax.** The existence check on an IPv6 extension header is performed via the `exthdr` matcher, not the `frag` payload matcher. Changed to `exthdr frag exists`. The `frag` keyword is a payload expression and only takes field names (`nexthdr`, `frag-off`, `more-fragments`, `id`).

4. **`frag offset 0` uses the wrong field name.** The fragment header field is `frag-off` per the nftables payload definition, not `offset`. Changed to `frag frag-off 0`.

## Review Notes

- The post uses `ip6 nexthdr icmpv6 icmpv6 type ...` throughout. This is the syntax shown on the nftables wiki and works for the common case, but it has a documented caveat: `ip6 nexthdr` only matches the IPv6 fixed header's Next Header field, so packets that carry IPv6 extension headers before ICMPv6 will not match. The more robust form is `meta l4proto icmpv6 icmpv6 type ...` (or simply `icmpv6 type ...`, which implicitly creates an `meta l4proto icmpv6` dependency). Left as-is since the wiki itself uses this form in basic examples and a rewrite would change every rule in the configuration; a future revision could note the caveat.
- The `# /etc/nftables.d/ipv6-filter.nft` path is a convention some admins adopt but is not shipped by upstream nftables. The default file on Debian-family distros is `/etc/nftables.conf`. The post does mention including the file from `nftables.conf`, so this is fine.
- `netdev` family: ingress hooks have existed since the family was introduced; egress hooks were added in kernel 5.16 (Jan 2022), so the "Ingress/egress per device" description is correct as of this post's date.
- ESP (50) and AH (51) protocol numbers are correct.
- All ICMPv6 type names used (`destination-unreachable`, `packet-too-big`, `time-exceeded`, `parameter-problem`, `nd-router-solicit`, `nd-router-advert`, `nd-neighbor-solicit`, `nd-neighbor-advert`, `echo-request`, `echo-reply`) are valid nftables symbolic constants.
- The rate-limit syntax (`limit rate N/second burst M packets`) is correct; `packets` is the default unit and may be omitted, but specifying it is valid.
