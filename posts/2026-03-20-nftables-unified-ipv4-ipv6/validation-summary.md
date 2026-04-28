# Validation Summary: How to Write Unified IPv4/IPv6 Firewall Rules with nftables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (inet family, sets, chains, hooks)
- IPv4 / IPv6 dual-stack firewalling
- ICMPv4 and ICMPv6 (NDP, packet-too-big, error types)
- systemd (nftables service)

## Sources Consulted
- nftables wiki — Configuring chains and netfilter hooks: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki — Sets: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nft(8) man page (nftables v1.0.9 verified locally)
- RFC 4193 — Unique Local IPv6 Unicast Addresses (fc00::/7, fd00::/8 locally assigned)
- RFC 4291 — IP Version 6 Addressing Architecture (fe80::/10 link-local)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4861 — Neighbor Discovery for IPv6
- RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls
- Local syntax verification with `nft -c -f` (nftables v1.0.9)

## Issues Found
- The `MGMT_NETS` IPv6 set elements used invalid IPv6 literals: `fd00:mgmt::/48` and `2001:db8:admin::/64`. The strings `mgmt` and `admin` are not valid hexadecimal, so `nft -c -f` rejects them with a syntax error. Replaced with valid placeholder addresses: `fd12:3456:789a::/48` (a valid RFC 4193 ULA) and `2001:db8:1::/64` (within the RFC 3849 documentation prefix).
- The blocklist examples used `2001:db8:attacker::1`, which is similarly invalid hex. Replaced with `2001:db8:1::1`.

## Review Notes
- The rest of the ruleset was syntax-checked with `nft -c -f` against nftables v1.0.9 and parsed cleanly (only `Operation not permitted` from non-root, which is expected and not a syntax issue).
- `ping6` is still functional on most distributions but has been merged into the unified `ping` binary in modern iputils; `ping -6 ...` is now preferred. Left as-is since `ping6` remains widely available.
- The `BOGON6` set is intentionally minimal; production deployments typically include additional prefixes (e.g., 2001:10::/28 ORCHIDv2, 2001::/32 Teredo if undesired, 100::/64 discard, etc.). Acceptable as a starting example.
- Whether `fc00::/7` belongs in a public-internet-facing bogon list depends on environment; for a host with no ULA expectation it is fine to drop, but routers carrying ULA traffic should not block it. The post's context (server input chain) makes it reasonable.
- The shebang `#!/usr/sbin/nft -f` matches Debian/Ubuntu/RHEL paths; some distributions install nft at `/usr/bin/nft`. Not changed since `/usr/sbin/nft` is the conventional path used by the upstream `/etc/nftables.conf` shipped by Debian.
