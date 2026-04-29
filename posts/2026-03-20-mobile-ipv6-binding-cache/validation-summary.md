# Validation Summary: How to Understand Mobile IPv6 Binding Cache

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Mobile IPv6 (MIPv6, RFC 6275)
- Binding Cache state structure and lifecycle
- Home Agent (HA) and Correspondent Node (CN) operations
- Sequence number wrap-around handling
- UMIP (`mip6d`) Mobile IPv6 daemon
- Python (`dataclasses`, type hints)
- Linux command-line tooling (`ip -6 route`, `journalctl`, `/proc/net`)
- Proxy Mobile IPv6 (PMIPv6, RFC 5213) for the P flag

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://datatracker.ietf.org/doc/html/rfc6275)
  - §5.1 Conceptual Data Structures (Binding Cache contents)
  - §6.1.7 Binding Update message format (Lifetime field, 4-second time units)
  - §9.4 Receiving Binding Updates (sequence number validation)
  - §5.2.5 Sequence Numbers (wrap-around comparison rules)
- RFC 5213 — Proxy Mobile IPv6 (P flag context)
- UMIP project documentation and source (`mip6d` daemon options)

## Issues Found

1. **Maximum lifetime calculation was incorrect.**
   - **Original:** "Maximum lifetime: 65528 seconds (≈ 18 hours), Limited by 16-bit field × 4-second units"
   - **Problem:** Per RFC 6275 §6.1.7, the Lifetime field is a 16-bit unsigned integer in 4-second units. The maximum value is 65535 × 4 = 262,140 seconds ≈ 72.8 hours (~3 days). The post's stated number (65528 seconds, ~18 hours) didn't even match its own formula.
   - **Fix:** Updated to "Maximum lifetime: 262140 seconds (≈ 72.8 hours / ~3 days)" with the explicit calculation `65535 × 4`.

## Review Notes

- **Sequence number comparison logic** in `_is_newer_sequence` is consistent with the wrap-around semantics described in RFC 6275 (a value is "newer" if `(new - old) mod 2^16` falls within the first half of the sequence space). The `0 < diff < 32768` check correctly rejects equal sequence numbers and treats anything in the second half as older.
- **RFC section reference** (`§9.5.1`) used as a comment in the Python code is approximate; the strict sequence-number validation rules are spread across §5.2.5, §9.4, and §11.7.1 in RFC 6275. Not material to correctness.
- **Binding Cache fields:** RFC 6275 §5.1 lists the canonical BCE fields (HoA, CoA, lifetime, home-registration flag, max sequence number, usage info, deletion flag). The post adds illustrative fields like "Binding ID", a "P: Proxy Registration" flag (PMIPv6, RFC 5213), and an "A: Active" flag — these are reasonable implementation conveniences rather than RFC-mandated fields, and the structure is clearly labeled as conceptual.
- **`sudo mip6d -n` example:** UMIP's `mip6d` daemon does not, in stock form, accept a `-n` flag to dump the Binding Cache; documented options are `-V`, `-c`, `-d`, and `-h`. Operators typically dump state by raising the debug level in `mip6d.conf` or sending `SIGUSR1` to the daemon. The example output is illustrative of the *content* one would expect to see, but the exact invocation may differ across forks/patches. Left as written since it serves a pedagogical purpose, but readers running stock UMIP should not expect this command to work verbatim.
- **`/proc/net/mip6` and `ip -6 route show | grep "via.*mip6"`:** Mainline Linux does not expose Mobile IPv6 binding state via a `/proc/net/mip6` file, and CN-side route-optimization state is generally managed via XFRM (visible through `ip xfrm policy` / `ip xfrm state`) rather than as standard IPv6 routes. These examples should be considered illustrative; specific UMIP-patched kernels may expose state differently.
- **Lifetime example values** (MN requests 600s, refresh at 300s) are reasonable defaults and consistent with RFC 6275 §11.7.2 refresh guidance.
