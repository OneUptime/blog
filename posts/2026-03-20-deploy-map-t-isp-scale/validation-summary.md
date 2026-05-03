# Validation Summary: How to Deploy MAP-T at ISP Scale

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- MAP-T (Mapping of Address and Port - Translation, RFC 7599)
- MAP-E port mapping algorithm (RFC 7597)
- IPv4/IPv6 transition mechanisms (DS-Lite, NAT64 for comparison)
- Jool (SIIT/NAT64 reference)
- VPP (Vector Packet Processing) MAP-T plugin
- OpenWRT `map` package
- Linux iproute2 (referenced)
- Python (PSID port computation)

## Sources Consulted
- RFC 7599 — Mapping of Address and Port using Translation (MAP-T): https://datatracker.ietf.org/doc/html/rfc7599
- RFC 7597 — Mapping of Address and Port with Encapsulation (MAP-E), §5.1 port mapping algorithm: https://datatracker.ietf.org/doc/html/rfc7597
- Jool official compliance/feature docs: https://jool.mx/en/intro-jool.html
- OpenWRT `map` package documentation (UCI options for MAP-T)
- VPP MAP/MAP-T plugin documentation (FD.io)

## Issues Found

1. **Jool was incorrectly described as supporting MAP-T.** Jool implements RFC 7915 (SIIT) and RFC 6146 (Stateful NAT64); it does **not** implement RFC 7599 (MAP-T) and has no PSID/port-sharing logic. The original `jool_siit instance add` + `jool_siit eamt add` example would only do prefix-to-prefix translation, not MAP-T's per-subscriber port multiplexing. Replaced the entire Jool BR example with a VPP MAP-T plugin example, which is a real MAP-T implementation, and added a one-line note explaining why Jool is not a fit.

2. **Linux `ip tunnel` MAP-T example was malformed and conceptually wrong.** The original used duplicate `mode` keywords (`mode ip6tnl ... mode ip4ip6`), which iproute2 rejects, and also conflated MAP-T (translation) with tunneling. Mainline Linux iproute2 has no native MAP-T mode. Replaced the broken bash block with a brief note explaining MAP-T is translation (not encapsulation) and that production CEs use OpenWRT or vendor firmware.

3. **PSID port-range example was arithmetically inconsistent.** With the stated parameters (psid_len=8, offset=6) the bit layout is a=6, k=8, m=2, so each (A, PSID) pair yields 2^m = 4 contiguous ports, and PSID=0 across A=1..63 yields 63 disjoint 4-port ranges totalling 252 ports. The original "Port range: Ports 1024-1279 (PSID=0)" implies a single contiguous 256-port range, which is impossible under those parameters. Rewrote the subscriber example to show the correct disjoint ranges and noted the A=0 exclusion that keeps well-known ports out of subscriber allocations.

4. **OpenWRT `option ealen '8'` was inconsistent with the stated rule.** EA-bits = (32 − ip4prefixlen) + psid_len. For /24 + 8-bit PSID this is 8 + 8 = 16. The original `ealen '8'` would leave 0 PSID bits (no port sharing), contradicting "256 subscribers share each IPv4." Changed to `ealen '16'`.

5. **Python `calculate_map_t_ports` used the wrong bit interpretation.** RFC 7597 §5.1 places A bits in the high-order, PSID in the middle, M in the low-order, with `offset` defined as the number of high-order A bits. The original code treated `offset` as the low-order m-bits, looped A from 0 (so PSID=5 ranges started at port 320, inside the well-known/registered range — exactly what offset=6 is supposed to prevent), and labeled the variable `a_bits` while using it for the loop range. Rewrote the function to follow RFC 7597 — `m_bits = 16 - offset - psid_len`, `a` loops from 1 to 2^offset − 1 (excluding A=0 well-known ports), and the bit layout matches RFC ordering. Output for PSID=5 is now in the high port ranges as MAP-T intends.

6. **Conclusion understated MAP-T's scale target.** Changed "thousands of concurrent sessions" to "millions of subscribers and concurrent sessions" — the entire motivation for stateless MAP-T (per RFC 7599 §1) is carrier-grade scale where stateful CGN becomes infeasible.

## Review Notes

- The "EUI6P" abbreviation for End-User IPv6 Prefix is not standard RFC terminology (the RFCs spell it out), but it's not wrong, just non-canonical, so it was left alone.
- "Troubleshooting: Complex (algorithmic)" in the comparison table is a fair characterisation but somewhat subjective; left as written.
- The `jool_siit eamt add` argument order in the original (IPv6 first, IPv4 second) is the reverse of Jool's documented examples; this is moot now that the Jool snippet has been replaced with VPP.
- Future-proofing: as Linux kernel + iproute2 gain MAP support, the CE section may warrant revisiting; today, OpenWRT `map` and VPP remain the practical Linux paths.
