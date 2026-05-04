# Validation Summary: How to Configure IPv6 Multicast for Video Streaming

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- IPv6 multicast (RFC 4291, RFC 4607, RFC 3306)
- PIM-SSM (Protocol Independent Multicast — Source-Specific Multicast)
- MLDv2 (Multicast Listener Discovery v2, RFC 3810)
- Python 3 `socket` module (UDP over IPv6, multicast options, MCAST_JOIN_SOURCE_GROUP)
- Linux kernel multicast forwarding (`/proc/net/ip6_mr_cache`)
- FRR (Free Range Routing) `vtysh` PIM/MLD configuration
- MPEG-TS framing for IPTV
- `ip link`, `ping6` (iputils)

## Sources Consulted
- RFC 4607 — Source-Specific Multicast for IP (defines SSM)
- RFC 3306 — Unicast-Prefix-based IPv6 Multicast Addresses (defines FF3x::/32)
- RFC 3810 — Multicast Listener Discovery Version 2 (MLDv2) for IPv6
- RFC 3678 — Socket Interface Extensions for Multicast Source Filters (group_source_req)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- Linux kernel source `net/ipv6/ip6mr.c` (`ipmr_mfc_seq_show`) for `/proc/net/ip6_mr_cache` column layout
- Linux UAPI `linux/in.h` for MCAST_JOIN_SOURCE_GROUP value (46) and `bits/socket.h` for sockaddr_storage size (128)
- Python 3.12 `socket` module (verified runtime: `dir(socket)` and `inet_pton` behavior)
- FRR documentation for IPv6 PIM/MLD CLI (`ipv6 pim`, `ipv6 mld version`, `ipv6 mld query-interval`, `show ipv6 mroute`)
- iputils `ping6(8)` man page for `-M do` (Path MTU Discovery)

## Issues Found

1. **Invalid IPv6 addresses with non-hex characters.** The post used `ff3e::db8:iptv:1`, `2001:db8::stream-server`, and `2001:db8::receiver`. The characters `i`, `t`, `v`, `s`, `r`, `m` are not valid hex digits, so `socket.inet_pton(AF_INET6, ...)` and `ping6` would have rejected them with `EINVAL`. Replaced with valid documentation-prefix addresses (`ff3e::db8:abcd:1` for the SSM group, `2001:db8::1` for the source/receiver, conforming to RFC 3849).

2. **`socket.MCAST_JOIN_SOURCE_GROUP` is not exposed by the Python `socket` module.** Verified on Python 3.12: the constant is absent (only `IPV6_JOIN_GROUP`, `IP_ADD_SOURCE_MEMBERSHIP`, etc. are exposed). The original code would have raised `AttributeError` at import-of-class-definition time. Defined the value explicitly (`MCAST_JOIN_SOURCE_GROUP = 46`, the Linux UAPI value from `linux/in.h`) and used it in `setsockopt`.

3. **`group_source_req` struct packing was wrong size.** The Linux kernel expects a `struct group_source_req` of 264 bytes on 64-bit systems: 4-byte `gsr_interface` + 4-byte alignment pad + two 128-byte `sockaddr_storage` fields. The original code packed `sockaddr_in6` (28 bytes) instead of `sockaddr_storage` (128 bytes), producing a 64-byte buffer that the kernel would reject with `EINVAL`. Added a `make_sockaddr_storage_in6` helper that pads each `sockaddr_in6` to 128 bytes, and verified the final buffer is exactly 264 bytes.

4. **MTU comment cited the wrong header size.** The post said "Well under 1480 (IPv6 MTU for GigE with 20-byte header headroom)". 20 bytes is the IPv4 header — the IPv6 fixed header is 40 bytes. With UDP (8 bytes), the maximum unfragmented payload on a 1500-byte MTU is 1500 − 40 − 8 = 1452 bytes. Updated the comment accordingly.

5. **awk column for packet count was wrong.** `/proc/net/ip6_mr_cache` columns (verified against the live kernel header on this machine and against `ip6mr_mfc_seq_show()` in `net/ipv6/ip6mr.c`) are: `Group | Origin | Iif | Pkts | Bytes | Wrong | Oifs...`. The script used `$7`, which would return the first output-interface entry rather than the packet counter. Changed to `$4` and added a comment documenting the column layout.

## Review Notes

- The struct-packing fix targets Linux x86_64. On other ABIs (32-bit, BSD) the alignment and padding could differ; readers running this on non-Linux platforms may need to adjust. The simpler alternative is to use a higher-level library (e.g. `ctypes` with the platform's actual `group_source_req` definition), but the in-repo fix preserves the author's pure-`struct` approach.
- The Python receiver pattern works for SSM joins; for ASM (any-source) joins, `IPV6_JOIN_GROUP` with `ipv6_mreq` is simpler and *is* exposed by the Python socket module.
- `ping6` is deprecated on modern iputils in favour of `ping -6`, but the binary is still shipped and the `-M do` flag still works as documented. No change made.
- The FRR/`vtysh` snippets match current FRR (≥ 7.x) syntax for IPv6 PIM and MLDv2.
- The SSM range claim (`ff3e::/32` global / `ff3x::/32` general) is correct per RFC 4607 §4.3 and RFC 3306.
