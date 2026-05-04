# Validation Summary: How to Configure MLD on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv6 Multicast Listener Discovery (MLD v1 and v2)
- Linux kernel IPv6 multicast (`ip6_mr` module, `MRT6_INIT`)
- iproute2 (`ip -6 maddr`, `ip -6 mroute`)
- Python `socket` module (`IPV6_JOIN_GROUP`, `inet_pton`, `if_nametoindex`)
- sysctl tuning (`net.ipv6.conf.*.force_mld_version`, `net.core.rmem_max/wmem_max`)
- smcroute (smcrouted/smcroutectl) static multicast routing daemon
- tcpdump capture filters for ICMPv6 / MLD
- procfs entries `/proc/net/ip6_mr_vif`, `/proc/net/ip6_mr_cache`

## Sources Consulted
- [RFC 2710 - Multicast Listener Discovery (MLD) for IPv6](https://datatracker.ietf.org/doc/html/rfc2710)
- [RFC 3810 - Multicast Listener Discovery Version 2 (MLDv2)](https://datatracker.ietf.org/doc/html/rfc3810)
- [Linux kernel IP sysctl docs (Documentation/networking/ip-sysctl.rst)](https://docs.kernel.org/networking/ip-sysctl.html)
- Linux kernel source `net/ipv6/addrconf.c` (mc_forwarding sysctl mode)
- [ip-mroute(8) man page (man7.org)](https://man7.org/linux/man-pages/man8/ip-mroute.8.html)
- [smcrouted(8) and smcroutectl(8) man pages (man.troglobit.com / Debian manpages)](https://man.troglobit.com/man8/smcrouted.8.html)
- [tcpdump(8) / pcap-filter(7) — `icmp6[icmptype]` syntax](https://www.tcpdump.org/manpages/pcap-filter.7.html)
- [libpcap issue #66 — HBH options vs `ip6[40]` filter for MLD](https://github.com/the-tcpdump-group/libpcap/issues/66)
- Python `socket` module documentation (`IPV6_JOIN_GROUP`, `ipv6_mreq`)

## Issues Found
1. **Invalid IPv6 multicast addresses with non-hex characters.** The post used `ff3e::db8:test`, `ff3e::db8:stream`, and `2001:db8::source`. Hextets must contain only `0-9a-f`; characters like `t`, `s`, `r`, `m`, `o`, `u` are not hex digits. `socket.inet_pton(AF_INET6, ...)` would raise `OSError: illegal IP address string passed to inet_pton`, and smcroute's parser would reject the config. Replaced with valid addresses (`ff3e::1`, `ff3e::db8:2`, `2001:db8::1`).

2. **`sysctl -w net.ipv6.conf.all.mc_forwarding=1` is misleading.** This sysctl is mode `0444` (read-only) in the kernel; it reflects the count of open `MRT6_INIT` sockets and is set automatically by a multicast routing daemon (e.g., `smcrouted`, `pim6sd`). Userspace writes do not enable forwarding. Replaced the line with an explanatory note.

3. **`ip -6 mroute show vif` is not a valid command.** Per `ip-mroute(8)`, the only subcommand is `show` with optional `to PREFIX`, `from PREFIX`, `iif DEVICE`, and `table TABLE_ID` modifiers — there is no `vif` subcommand. Removed the line; the procfs reads (`/proc/net/ip6_mr_vif`, `/proc/net/ip6_mr_cache`) already cover this.

4. **`smcrouted -n -s /var/run/smcroute.sock` is incorrect for verifying routes.** `smcrouted` is the daemon (not a query tool), `-n` runs in foreground, and `-s` means "log to syslog" (no argument). Routes are inspected via the `smcroutectl` client. Removed the misleading invocation; kept `smcroutectl show routes`.

5. **tcpdump filters using `ip6[40] == <type>` do not reliably match MLD.** MLD packets are required by RFC 2710 §3 / RFC 3810 §5 to carry an IPv6 Hop-by-Hop Options header (Router Alert option). With the HBH header present, byte offset 40 is the HBH `Next Header` field, not the ICMPv6 Type. The correct, header-chain-aware syntax is `icmp6[icmptype] == <type>`. Replaced all occurrences (`ip6[40] == 130/131/132/143`) with `icmp6[icmptype] == ...`, including the summary section.

## Review Notes
- The Python `struct.pack('I', ifindex)` for building `ipv6_mreq` works on Linux (4-byte `unsigned int`, native endianness) but `'@I'` would be more idiomatic and explicit about matching the native struct layout. Not changed — both produce identical bytes on supported platforms.
- `force_mld_version` description is accurate: 0 = auto (kernel uses MLDv2 and falls back to v1 if a v1 querier appears), 1 = force MLDv1, 2 = force MLDv2.
- ICMPv6 type numbers (130, 131, 132, 143) are correct per RFC 2710 §4 and RFC 3810 §5.
- `ping6` is the legacy command; on modern distributions `ping -6` (or just `ping <addr>`) is preferred but `ping6` still ships on most systems and works as written.
- The example output for `ip -6 maddr show` is plausible; `ff02::2` (all-routers) only appears when forwarding is enabled, which the post correctly notes.
- The `net.ipv6.conf.eth0.force_mld_version` sysctl is per-interface and matches the kernel sysctl tree.
