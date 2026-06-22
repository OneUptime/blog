# Validation Summary: How to Configure ip6tables Firewall Rules for IPv6 Traffic

## Status
validated

## Post Type
Tutorial / Guide (hands-on, command-heavy walkthrough)

## Technologies Covered
- ip6tables (Linux netfilter IPv6 firewall)
- ICMPv6 / Neighbor Discovery Protocol (NDP) / MLD
- conntrack, recent, limit, connlimit, multiport, rt, ipv6header match modules
- netfilter-persistent / iptables-persistent (Debian/Ubuntu)
- iptables-services (RHEL/CentOS/Rocky)
- systemd (oneshot restore service)
- IPv6 addressing (bogon/special-use ranges)

## Sources Consulted
- ip6tables(8) and iptables-extensions(8) man pages (netfilter.org)
- RFC 4443 (ICMPv6) — message type assignments
- IANA ICMPv6 Type Numbers registry (types 1-4, 128-137, 130-132)
- RFC 4861 (Neighbor Discovery for IPv6) — NDP types 133-137
- RFC 5095 (Deprecation of Routing Header Type 0)
- RFC 3849 (IPv6 documentation prefix 2001:db8::/32)
- RFC 3056 (6to4, 2002::/16) and RFC 4380 (Teredo, 2001:0000::/32)
- RFC 4843 (ORCHID, 2001:10::/28, deprecated)
- Debian/Ubuntu iptables-persistent and netfilter-persistent documentation
- Red Hat iptables-services documentation (/etc/sysconfig/ip6tables)

## Issues Found
1. **Invalid IPv6 address `2001:db8:app::/48`** (Database Servers / MongoDB example). The group `app` contains the character `p`, which is not a valid hexadecimal digit, so this address literal would be rejected by ip6tables. Changed to a valid documentation-prefix address: `2001:db8:abc::/48`.
2. **Mislabeled command comment** in "Viewing Current Rules". The comment read "List rules in nat table (if applicable)" while the command used `-t mangle`. Corrected the comment to refer to the mangle table to match the command.
3. **Inaccurate "per source" claim for the `limit` match** in the Rate Limiting section. The `-m limit` match applies a single global token-bucket rate to the rule, not a per-source-IP limit. Clarified the comment to state it is a global rate limit and noted that the `hashlimit` match is needed for per-source limiting.

## Review Notes
- ICMPv6 type numbers (1-4 errors, 128/129 echo, 130-132 MLD, 133-137 NDP/Redirect) all match RFC 4443 / IANA assignments. The "never block essential ICMPv6" guidance is correct and important.
- Bogon ranges are accurate: 2001:db8::/32 (documentation), 2002::/16 (6to4), 2001:0::/32 (Teredo, equivalent to 2001:0000::/32), 2001:10::/28 (original deprecated ORCHID). Note: the current ORCHIDv2 range (RFC 7343) is 2001:20::/28 — the post cites the older deprecated range, which is acceptable in a bogon-filtering context but worth being aware of.
- The link-local drop rule `! -i lo -s fe80::/10 -j DROP` is syntactically valid but can break NDP if applied before the ICMPv6 NDP allow rules, since neighbor solicitation/advertisement use link-local sources. The post's overall ordering places ICMPv6 allows first in the complete script, so this is presented safely, but readers should preserve that ordering.
- The SSH `recent`-module brute-force pattern and the connlimit masks (/128 per host, /64 per subnet) are correct for IPv6.
- Persistence instructions for Debian/Ubuntu (rules.v6) and RHEL/CentOS (/etc/sysconfig/ip6tables) are accurate.
- The `-m state` vs `-m conntrack` note is correct; conntrack is the modern recommended module.
