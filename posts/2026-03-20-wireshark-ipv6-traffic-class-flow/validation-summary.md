# Validation Summary: How to Analyze IPv6 Traffic Class and Flow Labels in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filters)
- tshark (CLI usage)
- IPv6 (RFC 8200 header fields: Traffic Class, Flow Label)
- DSCP / Differentiated Services (RFC 2474)
- ECN / Explicit Congestion Notification (RFC 3168)
- QoS classes: EF, AF11, AF41

## Sources Consulted
- Wireshark display filter reference for IPv6: https://www.wireshark.org/docs/dfref/i/ipv6.html
- RFC 8200 (IPv6 Specification) — Traffic Class (8 bits) and Flow Label (20 bits)
- RFC 2474 (DSCP) — DSCP occupies upper 6 bits of the DS field
- RFC 3168 (ECN) — ECN occupies lower 2 bits; values 00 Not-ECT, 01 ECT(1), 10 ECT(0), 11 CE
- RFC 4594 (DiffServ class recommendations) — EF=46, AF11=10, AF41=34

## Issues Found
- Invalid IPv6 literal `2001:db8::client` in the "Flow Label Analysis" section. The characters `l`, `i`, `n`, `t` are not valid hexadecimal digits, so this would fail display filter parsing. Replaced with `2001:db8::1` as a placeholder address.

## Review Notes
- Wireshark filter names `ipv6.tclass`, `ipv6.tclass.dscp`, `ipv6.tclass.ecn`, and `ipv6.flow` are all correct per the current display filter reference.
- Arithmetic conversions between DSCP and Traffic Class byte values are correct (DSCP 46 → 0xB8, DSCP 10 → 0x28).
- Wireshark internally stores the Flow Label as a 24-bit integer (the upper 4 bits masked) while RFC 8200 defines it as 20 bits — the post's 20-bit statement is semantically correct for users writing filters.
- The post describes DSCP AF41 (34) as "interactive traffic"; RFC 4594 recommends AF41 for multimedia conferencing / interactive real-time video, which is a reasonable characterization.
