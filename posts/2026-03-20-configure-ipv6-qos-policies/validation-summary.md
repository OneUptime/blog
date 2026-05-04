# Validation Summary: How to Configure IPv6 Quality of Service (QoS) Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6 (Traffic Class field, RFC 8200)
- DiffServ / DSCP code points (RFC 2474, RFC 2597, RFC 3246, RFC 8622)
- Linux `tc` (traffic control) with HTB qdisc
- FQ-CoDel queueing discipline
- `ip6tables` mangle table with the `DSCP` target
- u32 packet classifier

## Sources Consulted
- RFC 8200 (IPv6 specification — header layout, Traffic Class field)
- RFC 2474 (Definition of the DS Field in the IPv4 and IPv6 Headers)
- RFC 2597 (Assured Forwarding PHB Group — AF31, AF41 code points)
- RFC 3246 (Expedited Forwarding PHB — EF code point 46)
- RFC 8622 (A Lower-Effort Per-Hop Behavior — LE code point 1)
- `tc-u32(8)` man page and iproute2 source for u32 classifier syntax
- `iptables-extensions(8)` for the `DSCP` target (`--set-dscp-class`)
- Linux kernel `include/uapi/linux/ipv6.h` for IPv6 header field layout
- HTB and FQ-CoDel documentation in iproute2

## Issues Found
- **Incorrect tc u32 IPv6 DSCP filters (Step 2).** The original filters used the IPv4 pattern `u32 match u8 0xXX 0xfc at 1`, which matches a single byte at offset 1 of the header. In IPv4 that byte is the TOS/DSCP byte, but in IPv6 the 8-bit Traffic Class field is split across bytes 0-1: the low nibble of byte 0 contains TC[7:4] and the high nibble of byte 1 contains TC[3:0]. Matching at byte 1 with mask 0xFC therefore captures TC[3:0] plus the upper two bits of the Flow Label, not the DSCP. Replaced each filter with a 16-bit match at offset 0 using value `DSCP << 6` and mask `0x0FC0`, which correctly isolates the DSCP bits (bits 4-9 of the IPv6 header). Updated the explanatory comment accordingly. The DSCP class assignments (CS6→1:10, EF→1:20, AF41/AF31→1:30) and numeric DSCP values were already correct; only the byte-level encoding of the filter needed fixing.

## Review Notes
- The DSCP code-point reference table is consistent with the relevant RFCs (CS6=48, EF=46, AF41=34, AF31=26, CS1=8, LE=1).
- `ip6tables -t mangle ... -j DSCP --set-dscp-class ...` works for IPv6; the `DSCP` target supports both IPv4 and IPv6 in modern xtables. The `LE` class name is recognized by recent iptables/nftables releases (RFC 8622). On older distributions where `LE` may not be in the class table, users can substitute `--set-dscp 0x01`.
- HTB syntax, class hierarchy, FQ-CoDel as leaf qdisc, and the `default 40` fallback class are all idiomatic and correct.
- An alternative, more readable IPv6 DSCP filter form is `u32 match ip6 priority 0xXX 0xfc`, which iproute2's u32 parser translates to the proper bit positions; the raw `match u16 ... at 0` form was kept here because it avoids any version-dependent behavior in the `ip6 priority` shortcut and makes the bit math explicit.
- The post does not mention that DSCP markings on egress are commonly bleached (rewritten to 0) by upstream ISPs and many internet transit providers, so end-to-end DSCP preservation is in practice limited to managed/SD-WAN paths. The conclusion does include the "if ISPs honor DSCP marking" caveat, which is sufficient.
