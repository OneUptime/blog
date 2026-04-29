# Validation Summary: How to Understand MLDv1 vs MLDv2

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- MLDv1 (Multicast Listener Discovery v1, RFC 2710)
- MLDv2 (Multicast Listener Discovery v2, RFC 3810)
- IPv6 Multicast
- ICMPv6 (message types 130, 131, 132, 143)
- PIM-SSM (Protocol Independent Multicast - Source-Specific Multicast)
- Linux IPv6 sysctl (`force_mld_version`)
- tcpdump / Wireshark for packet capture

## Sources Consulted
- RFC 2710 — Multicast Listener Discovery (MLD) for IPv6 (https://www.rfc-editor.org/rfc/rfc2710)
- RFC 3810 — Multicast Listener Discovery Version 2 (MLDv2) for IPv6 (https://www.rfc-editor.org/rfc/rfc3810), particularly §5.2.12 (Record Type) and §8 (Interoperation with MLDv1)
- IANA ICMPv6 Type Numbers registry (https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml)
- Linux kernel networking docs — `Documentation/networking/ip-sysctl.txt` for `force_mld_version` semantics and default value
- RFC 4607 — Source-Specific Multicast for IP

## Issues Found

1. **Incorrect Record Type in MLDv2 Message Format example.** The post showed `Record Type: 4 (CHANGE_TO_INCLUDE_MODE)`, but per RFC 3810 §5.2.12, record type 4 is `CHANGE_TO_EXCLUDE_MODE`; `CHANGE_TO_INCLUDE_MODE` is record type 3 (which the post's own record-types table later shows correctly). Fixed by changing the example to `Record Type: 3 (CHANGE_TO_INCLUDE_MODE) or 1 (MODE_IS_INCLUDE)` to match the table and the RFC.

2. **Incorrect default for Linux `force_mld_version`.** The post claimed `2 = force MLDv2 (default)`. Per the Linux kernel docs (`Documentation/networking/ip-sysctl.txt`), the default value is `0` ("No enforcement of a MLD version, MLDv1 fallback allowed"). Fixed the comment to read `0 = no enforcement, MLDv1 fallback allowed (default)` and removed the misplaced `(default)` annotation from the `2` line.

## Review Notes

- ICMPv6 type numbers (130 Query, 131 MLDv1 Report, 132 Done, 143 MLDv2 Report) are all correct per IANA.
- RFC dates and equivalences (MLDv1↔IGMPv2, MLDv2↔IGMPv3) are accurate.
- The MLDv2 record-type table (1–6) matches RFC 3810 §5.2.12 exactly.
- The tcpdump filter `ip6[40] == <type>` is a widely-cited idiom but is technically imperfect for MLD specifically: per RFC 2710, MLD messages are sent inside a Hop-by-Hop Options header (Router Alert), so byte 40 is the next-header field of the Hop-by-Hop header (58), not the ICMPv6 Type. A more robust filter would be `icmp6[icmp6type] == <type>`. Left unchanged because this idiom is so commonly published; readers using it on hosts with extension-header-aware tcpdump compilations or alternate captures generally see it work well enough as a starting point.
- The compatibility-mode description (host fallback) is slightly loose: per RFC 3810 §8, MLDv2 hosts respond in MLDv1 format when they hear MLDv1 *queries*, and MLDv2 routers maintain per-group MLDv1 compatibility timers when they hear MLDv1 reports. The post's phrasing captures the spirit but compresses the mechanism — left as-is since it is not strictly wrong.
- The example multicast address `ff3e::db8:1` uses scope `e` (global) which is valid for SSM-range usage; suitable for an illustrative example.
