# Validation Summary: How to Configure IPv6 Multicast on Cisco Routers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS (12.4(4)T and later)
- IPv6 unicast & multicast routing
- PIM-SM (Protocol Independent Multicast - Sparse Mode)
- BiDir PIM (Bidirectional PIM)
- BSR (Bootstrap Router)
- Static RP (Rendezvous Point)
- MLD (Multicast Listener Discovery, v1/v2)
- IPv6 access-lists (named ACLs)

## Sources Consulted
- Cisco IOS IPv6 Multicast Configuration Guide
- Cisco IOS IPv6 Command Reference (`ipv6 pim`, `ipv6 mld`, `ipv6 multicast-routing`)
- RFC 3810 (MLDv2 for IPv6)
- RFC 7761 (PIM-SM)
- RFC 5015 (Bidirectional PIM)
- RFC 5059 (Bootstrap Router for PIM)
- RFC 4291 (IPv6 Addressing Architecture — valid hex characters in addresses)
- RFC 4291 / RFC 7346 (IPv6 multicast address scopes — ff0e/ff3e prefixes)

## Issues Found

1. **Invalid IPv6 addresses containing non-hex characters.** Several example addresses in the post used letters that are not valid hexadecimal digits (only `0-9` and `a-f` are permitted in IPv6 address fields):
   - `2001:db8:wan::1/64` → fixed to `2001:db8:2::1/64` ('w' and 'n' are invalid hex).
   - `2001:db8::rp/128` and all references to `2001:db8::rp` → fixed to `2001:db8::1` ('r' and 'p' are invalid hex).
   - `2001:db8::rp1` / `2001:db8::rp2` → fixed to `2001:db8::a` / `2001:db8::b`.
   - `ff3e::db8:test` → fixed to `ff3e::db8:cafe` ('t' and 's' are invalid hex).
   - `ff3e::db8:stream` → fixed to `ff3e::db8:beef` ('s', 't', 'r' are invalid hex).

2. **BSR configuration syntax was incorrect.** The post used IPv4-style syntax (`candidate-bsr <interface>` with hyphen and an interface argument). Cisco IOS for IPv6 PIM uses two separate keywords and an IPv6 address:
   - `ipv6 pim bsr candidate-bsr GigabitEthernet0/0 priority 100` → fixed to `ipv6 pim bsr candidate bsr 2001:db8::1 priority 100`.
   - `ipv6 pim bsr candidate-rp GigabitEthernet0/0 group-list ff3e::/32 priority 10` → fixed to `ipv6 pim bsr candidate rp 2001:db8::1 group-list ff3e::/32 priority 10`.

3. **MLD `query-max-response-time` units were wrong.** The post described the value as "in tenths of seconds" — that is the IPv4 IGMP convention. The IPv6 `ipv6 mld query-max-response-time` command takes the value in seconds. Updated the comment accordingly and noted the default of 10 seconds.

4. **`show ipv6 pim bidir df` is not a valid command.** The Cisco IOS show command for the BiDir Designated Forwarder is `show ipv6 pim df`. Fixed.

5. **`ipv6 pim accept-rp` does not exist for IPv6.** The IPv4 `ip pim accept-rp` command has no direct IPv6 counterpart in Cisco IOS. The closest equivalent for protecting the RP from unauthorized sources is `ipv6 pim accept-register {list <acl> | route-map <map>}`. Replaced the example so it filters source registrations at the RP, which is the actual protection mechanism available for IPv6 PIM.

## Review Notes
- All other commands (`ipv6 multicast-routing`, `ipv6 pim` per interface, `ipv6 pim rp-address ... [bidir]`, `ipv6 mld version`, `ipv6 mld query-interval`, `ipv6 mld query-timeout`, `ipv6 mld join-group`, `ipv6 mld access-group`, `show ipv6 mroute`, `show ipv6 pim neighbor`, `show ipv6 pim interface`, `show ipv6 pim topology`, `show ipv6 pim bsr {election|rp-cache}`, `show ipv6 mld {groups|interface|traffic}`, `debug ipv6 pim`, `debug ipv6 mld`) were verified against Cisco IOS documentation and are correct.
- Multicast scope prefixes used in examples (`ff3e::/32` admin-local source-specific, `ff0e::/8` global) are valid per RFC 4291 / RFC 7346.
- `2001:db8::/32` is the documentation prefix from RFC 3849, which is appropriate for examples.
- Cisco IOS 12.4(4)T as the minimum version for full IPv6 PIM-SM support is accurate; users on modern Cisco IOS XE or IOS XR may see slightly different command shells (especially IOS XR), but the IOS classic syntax shown is correct.
- `show ipv6 multicast` exists but on many platforms returns minimal output; users may prefer `show ipv6 pim interface` or `show running-config | include multicast` for richer verification.
