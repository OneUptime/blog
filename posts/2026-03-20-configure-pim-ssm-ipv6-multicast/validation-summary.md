# Validation Summary: How to Configure PIM-SSM for IPv6 Multicast Routing

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- PIM-SSM (Protocol Independent Multicast - Source-Specific Multicast) for IPv6
- FRRouting (FRR) — `pim6d` daemon
- MLDv2 (Multicast Listener Discovery v2)
- IPv6 multicast addressing (`ff3x::/32` SSM range)
- Linux kernel multicast routing
- Python `socket` module with `MCAST_JOIN_SOURCE_GROUP` setsockopt

## Sources Consulted
- RFC 4607 — Source-Specific Multicast for IP (defines `FF3x::/32` IPv6 SSM range)
- RFC 3810 — Multicast Listener Discovery Version 2 (MLDv2) for IPv6
- RFC 3678 — Socket Interface Extensions for Multicast Source Filters (defines `group_source_req`)
- RFC 4291 — IPv6 Addressing Architecture (multicast scopes)
- FRRouting daemons file: https://github.com/FRRouting/frr/blob/master/tools/etc/frr/daemons
- FRRouting PIM documentation: https://docs.frrouting.org/en/latest/pim.html
- Linux kernel UAPI header `include/uapi/linux/in.h` (`struct group_source_req`)
- Linux kernel `net/ipv6/ipv6_sockglue.c` (MCAST_JOIN_SOURCE_GROUP handling)

## Issues Found

1. **Wrong FRR daemon for IPv6 PIM (critical).** The post enabled `pimd=yes` in `/etc/frr/daemons`. `pimd` is the IPv4-only PIM daemon; IPv6 PIM in FRR is provided by a separate daemon, `pim6d` (added in FRR 8.4, Nov 2022). With `pimd=yes` alone, none of the `ipv6 pim` / `ipv6 mld` configuration would take effect. **Fix:** changed the sed command to toggle `pim6d=no` → `pim6d=yes` and added a comment explaining the distinction.

2. **Python `MCAST_JOIN_SOURCE_GROUP` struct sizes wrong (critical).** The Python code packed the group and source addresses as 28-byte `sockaddr_in6` structures. The Linux kernel's `struct group_source_req` (per RFC 3678 / `linux/in.h`) uses `struct sockaddr_storage` — 128 bytes — for both `gsr_group` and `gsr_source`. Passing a 64-byte buffer (4 + 4 + 28 + 28) to `setsockopt` fails the `optlen < sizeof(struct group_source_req)` check in `net/ipv6/ipv6_sockglue.c` and returns `EINVAL`. **Fix:** introduced a `make_sockaddr_storage_in6` helper that pads the `sockaddr_in6` packing up to 128 bytes, and applied the same pattern to the receiver code. Updated the inline struct comment to reflect `sockaddr_storage = 128 bytes`.

3. **SSM prefix list defined but not applied (minor).** `ipv6 prefix-list SSM_RANGE seq 10 permit ff3e::/32 le 128` only declares a prefix list — it does nothing for PIM-SSM unless attached with `ipv6 pim ssm prefix-list SSM_RANGE`. While FRR's default SSM range is already `ff3x::/32` so PIM-SSM works without this, a reader following the post who *intends* to use the prefix list would find it ineffective. **Fix:** added the `ipv6 pim ssm prefix-list SSM_RANGE` line directly after the prefix-list declaration.

## Review Notes

- The `IPv6 group range` row in the comparison table lists PIM-SM as `ff0x::/16`. PIM-SM in IPv6 actually operates over essentially the entire `ff00::/8` multicast block excluding the SSM range (`ff3x::/32`); `ff0x::/16` only describes the well-known/permanent scope subset. This is a conceptual simplification rather than an outright error and was left as-is to preserve the author's voice.
- `vtysh -c "show ipv6 pim ssm"` works in current FRR; some versions also accept `show ipv6 pim ssm-range`. Both render the configured SSM range — left unchanged.
- `2001:db8::source` and `ff3e::db8:stream` use letters outside hex (`s`, `o`, `u`, `r`, `c`, `e`, `t`, `m`), so they are not literally valid IPv6 addresses and would fail `inet_pton`. They are clearly placeholders for readability and would need to be replaced with real addresses (e.g., `2001:db8::1` and `ff3e::1`) before running the code. Left as-is since the intent is documentation.
- Python f-strings (used in the sender code) require Python 3.6+; this is fine for any current distro.
