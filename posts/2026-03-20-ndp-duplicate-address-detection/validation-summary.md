# Validation Summary: How to Understand Duplicate Address Detection (DAD)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Duplicate Address Detection (DAD) — RFC 4862
- Neighbor Solicitation / Neighbor Advertisement (NS/NA) — RFC 4861
- SLAAC (Stateless Address Autoconfiguration)
- Linux IPv6 stack (`/proc/sys/net/ipv6/conf/<iface>/...` sysctls)
- `ip` (iproute2) command
- `tcpdump` BPF filters
- Python `subprocess` / `re` for parsing `ip` output

## Sources Consulted
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (https://www.rfc-editor.org/rfc/rfc4862), particularly §5.4 "Duplicate Address Detection" and §5.4.4 conflict detection rules.
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6) (https://www.rfc-editor.org/rfc/rfc4861), §4.4 "Neighbor Advertisement Message Format" and §7.2.4 "Sending Solicited Neighbor Advertisements" for S/O flag semantics.
- RFC 4291 — IPv6 Addressing Architecture, §2.7.1 for solicited-node multicast construction.
- Linux kernel source: `net/ipv6/addrconf.c` — `addrconf_dad_failure()` log message format and `pr_fmt(fmt) "IPv6: "` prefix.
- Linux kernel networking documentation: `Documentation/networking/ip-sysctl.rst` for `dad_transmits` and `use_tempaddr` semantics.
- `tcpdump(8)` man page / pcap-filter(7) for BPF filter syntax including `src ::` and `ip6[40] == 135`.

## Issues Found

1. **Incorrect NA flag values for DAD conflict response.** The post originally stated: "If NA received with S=0, O=0 from another node: Address conflict!". Per RFC 4861 §7.2.4, the S (Solicited) flag is set to 0 in DAD-response NAs (because the soliciting NS used :: as source, so the NA is multicast to all-nodes), but the O (Override) flag is typically set to 1 — RFC 4861 §4.4 says O "SHOULD be set in other solicited advertisements and in unsolicited advertisements." More importantly, RFC 4862 §5.4.4 specifies that DAD conflict detection depends **only on the Target Address matching the tentative address** — the flag values are irrelevant to the conflict determination. The original wording was misleading. Changed to: "If NA received with Target Address matching the tentative address: Address conflict! ... (Per RFC 4862 §5.4.4, the flag values do not matter; only the target match.)"

## Review Notes

- Variable names `DAD_TRANSMIT_COUNT` and `RETRANS_TIMER` used in the timer formula are not the exact RFC 4862 names (the RFC uses `DupAddrDetectTransmits` and `RetransTimer`). The numeric formula and default value (1 × 1000 ms = 1 s) are correct, so this is a stylistic deviation rather than a technical error and was left alone.
- The `tcpdump` filter `icmp6 and ip6[40] == 135 and src ::` is valid: byte 40 of an IPv6 packet (no extension headers) is the ICMPv6 Type, type 135 = NS, and `src ::` matches the unspecified source used by DAD probes.
- The solicited-node multicast `ff02::1:ff00:1` for `2001:db8::1` is correctly constructed (low 24 bits 00:00:01).
- The Linux dmesg format string in the post is consistent with the kernel source: `net/ipv6/addrconf.c` uses `pr_fmt(fmt) "IPv6: "` plus `"%s: IPv6 duplicate address %pI6c used by %pM detected!\n"`, producing output like `IPv6: eth0: IPv6 duplicate address 2001:db8::100 detected!`. The post omits the "used by <MAC>" portion present in modern kernels, but the example is representative and not incorrect.
- Default `dad_transmits=1` on Linux matches RFC 4862 §5.1's recommended default.
- The Python helper defines a `pattern` regex variable that is never used (the function falls back to substring `in` checks). This is a minor code-cleanliness issue but not a functional or correctness bug, so it was left as-is per the "only fix technical errors" instruction.
- The claim "If link-local DAD fails (extremely rare - would need MAC collision)" is approximately correct for EUI-64-based link-locals; with stable-privacy or RFC 7217 link-locals (modern systemd-networkd / NetworkManager), MAC collision is not the only theoretical cause, but the post's framing is fine for an introductory guide.
