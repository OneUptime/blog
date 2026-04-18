# Validation Summary: How to Verify IPv6 Multicast Group Membership

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 multicast (RFC 4291 addressing)
- MLDv1 / MLDv2 (RFC 2710, RFC 3810)
- Linux `iproute2` (`ip -6 maddr`, `ip -6 addr`, `bridge mdb`)
- `/proc/net/igmp6` kernel interface
- `tcpdump` / BPF filters with IPv6 extension headers
- Python `socket` (IPV6_JOIN_GROUP, IPV6_MULTICAST_HOPS, `inet_pton`)
- FRR (`pimd`, `vtysh`), Cisco IOS (`show ipv6 mld ...`), Juniper JunOS MLD commands
- Linux bridge MLD snooping

## Sources Consulted
- RFC 3810 — Multicast Listener Discovery Version 2 (MLDv2) for IPv6 — https://www.rfc-editor.org/rfc/rfc3810 (MLD carried behind HBH Router Alert)
- RFC 2711 — IPv6 Router Alert Option — https://www.rfc-editor.org/rfc/rfc2711
- RFC 4291 — IPv6 Addressing Architecture — https://www.rfc-editor.org/rfc/rfc4291 (valid multicast address syntax; hex only)
- iproute2 source `ip/ipmaddr.c` (`read_igmp6`, `print_maddr`) — https://git.kernel.org/pub/scm/network/iproute2/iproute2.git (confirms IPv6 groups are printed without a features/flags field)
- iproute2 `ip-address(8)` — `autojoin` flag is on `ip addr add`, not `ip maddr add`
- Linux kernel `net/ipv6/mcast.c` `igmp6_mc_seq_show` — `/proc/net/igmp6` column layout (index, name, group, users, flags, timer)
- `pcap-filter(7)` — confirms `ip6[N]` indexes from the start of the IPv6 header; extension headers are not transparently skipped
- FRR User Guide — `show ipv6 mld groups` is a valid `vtysh` command under `pimd`
- Juniper TechLibrary — `show mld group` (MLD is IPv6-only; no `inet6` modifier)
- Cisco IOS `show ipv6 mld snooping groups` reference

## Issues Found
1. **Invalid hex in IPv6 literals.** `ff3e::db8:test`, `ff3e::db8:stream`, and `2001:db8::host` contain letters that are not hex digits (`t`, `s`, `r`, `m`, `h`, `o`). They would fail parsing if a reader ran the commands verbatim. Replaced with `ff3e::db8:1234` / `ff3e::db8:abcd` and `fe80::1`.
2. **Bogus `flags permanent/dynamic` in example output.** `ip -6 maddr show` does not emit a flags/features column for IPv6 groups (iproute2's `read_igmp6` never populates `features`). Rewrote the example output and removed the invented flag table; replaced it with a pointer to `/proc/net/igmp6` for raw flag bits and a note that `users` is only printed when greater than 1.
3. **`cat /proc/net/ipv6` is not a valid path.** The kernel file for the IPv6 multicast listener table is `/proc/net/igmp6`. Corrected, and added the actual column layout.
4. **`ip -6 maddr add ... autojoin` is invalid.** The `autojoin` keyword is accepted by `ip addr add` (sets `IFA_F_MCAUTOJOIN`), not by `ip maddr add`. Changed the kernel-autojoin example to `ip -6 addr add ff3e::db8:1234/128 dev eth0 autojoin`.
5. **Incorrect tcpdump offset for MLDv2 Reports.** RFC 3810 requires MLD messages to ride behind a Hop-by-Hop Options header with the Router Alert option (8 bytes). The ICMPv6 Type byte therefore sits at `ip6[48]`, not `ip6[40]`. Updated the filter in both the capture example and the summary, and added a short inline explanation.
6. **Juniper `show mld group inet6` is wrong.** MLD is IPv6-only; JunOS does not take an `inet6` modifier on `show mld group`. Dropped the modifier from both the basic and `detail` forms.

## Review Notes
- `ss -6 -unlp` does not actually enumerate multicast memberships; it just lists UDPv6 listen sockets whose PID you can then cross-reference against `/proc/net/igmp6`. The inline comment is slightly loose but not technically wrong, so left as-is to preserve voice.
- The sender example sets `IPV6_MULTICAST_HOPS` but not `IPV6_MULTICAST_IF`. On multi-homed hosts the outbound interface will be whichever one routes the multicast group, which may not be desired. Acceptable for a simple test but worth noting.
- The tcpdump `icmp6` primitive's ability to traverse extension headers is libpcap-version dependent. On any libpcap recent enough to handle HBH transparently, `icmp6 and ip6[48] == 143` works; on very old libpcap, users may need `ip6 proto 58 and ip6[48] == 143`. Not worth complicating the post.
- The Python receiver example does not enable `IPV6_V6ONLY` explicitly; behavior on dual-stack hosts depends on `/proc/sys/net/ipv6/bindv6only`, but since the socket is `AF_INET6` with an IPv6 multicast group, this is fine.
