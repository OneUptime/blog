# Validation Summary: How to Configure IPv6 QoS on Linux with tc

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `tc` / iproute2
- Linux traffic control qdiscs (`htb`, `prio`, `fq_codel`)
- IPv6 Traffic Class and DSCP
- Linux `u32` classifier
- QoS policing and shaping

## Sources Consulted
- `man tc` (local iproute2 manual page)
- `man tc-u32` (local iproute2 manual page)
- `man tc-htb` (local iproute2 manual page)
- `man tc-prio` (local iproute2 manual page)
- `man tc-police` (local iproute2 manual page)
- `man tc-fq_codel` (local iproute2 manual page)
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers" - https://www.rfc-editor.org/rfc/rfc2474.html
- IANA Differentiated Services Field Codepoints (DSCP) registry - https://www.iana.org/assignments/dscp-registry

## Issues Found
- The HTB root qdisc used `default 30`, which sent unclassified traffic to class `1:30` instead of the intended bulk/default class `1:40`. Updated it to `default 40`.
- The IPv6 DSCP examples incorrectly treated the Traffic Class field as a raw byte at offset `1`. Replaced those matches with `match ip6 priority ...` so the filters target the IPv6 Traffic Class field correctly while masking out ECN bits.
- The HTB section described the VoIP class as "strict priority". In HTB, `prio` affects service order among classes but is not a separate strict-priority scheduler, so the wording was updated to "highest HTB priority".
- The policing example used an invalid IPv6 address (`2001:db8::video-server/128`) and relied on implicit policer defaults that reclassify exceeding traffic. Replaced it with a valid documentation address, added the missing `IFACE` assignment, switched the protocol match to `match ip6 protocol 17 0xff`, and made the policer action explicit with `conform-exceed drop/ok`.
- The closing paragraph repeated the incorrect byte-offset explanation and overstated FQ-CoDel as "preventing" bufferbloat. Updated it to reflect direct Traffic Class matching and that FQ-CoDel helps reduce queueing delay and bufferbloat.

## Review Notes
- The configured HTB `burst` values are reasonable illustrative examples, but real deployments may need to tune them for interface speed and kernel timing characteristics.
- The `match ip6 protocol 17 0xff` example matches the IPv6 Next Header field in the base header. If extension headers appear before UDP, more advanced matching is required.
