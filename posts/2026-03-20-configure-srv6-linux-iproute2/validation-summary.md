# Validation Summary: How to Configure SRv6 on Linux with iproute2

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- Linux kernel networking (`seg6` lightweight tunnel, `seg6local`)
- iproute2 (`ip route`, `ip -6 route`, `encap seg6`, `encap seg6local`)
- Linux sysctl (`net.ipv6.conf.*.seg6_enabled`)
- IPv6 Routing Header / SRH
- tcpdump (BPF/pcap filters for IPv6 extension headers)
- VRF / Linux routing tables

## Sources Consulted
- RFC 8754 — IPv6 Segment Routing Header (SRH)
- RFC 8986 — SRv6 Network Programming (End, End.X, End.DT4, End.DT6, End.DX6 behaviors)
- RFC 9602 — IANA reservation of `5f00::/16` for SRv6 SIDs
- Linux kernel `Documentation/networking/seg6-sysctl.txt`
- Linux kernel `Documentation/networking/ip-sysctl.rst` (for `accept_ra` semantics)
- iproute2 `ip-route(8)` and `ip-sr(8)` man pages
- Linux kernel commit history: `6c8702c60b88` (4.10, seg6 lwt), `004d4b274e2a` (4.14, seg6local), `7a3f5b0de364` (5.11, End.DT4)
- pcap-filter(7) for tcpdump syntax

## Issues Found

1. **Incorrect kernel version for `seg6local`** — The introduction stated SRv6 was supported "since version 4.10 via the `seg6` and `seg6local` route types." Only `seg6` (encapsulation lwtunnel) was added in 4.10; `seg6local` endpoint behaviors landed in **Linux 4.14**. Updated the sentence to reflect both versions accurately.

2. **Incorrect `accept_ra` claim** — The post included `sysctl -w net.ipv6.conf.all.accept_ra=1` with the comment "Accept SRH packets (required at endpoints)." `accept_ra` controls IPv6 Router Advertisement processing (SLAAC, RFC 4861) and has nothing to do with SRH acceptance. SRH acceptance is governed by `seg6_enabled`. Removed the incorrect line and clarified the per-interface `seg6_enabled` comment instead.

3. **Invalid IPv6 address `5f00:3:0:dt4::`** — The character `t` is not a valid hexadecimal digit, so this address would be rejected by `ip route`. Replaced with `5f00:3:0:e004::` (valid hex, consistent with the locator/function pattern used elsewhere in the post).

4. **Invalid IPv6 address `5f00:3:0:dx6::`** — The character `x` is not valid hex. Replaced with `5f00:3:0:e006::`.

5. **Wrong parameter for `End.DT6`** — The post used `vrftable 254` for `End.DT6`. The conventional and broadly-compatible parameter for `End.DT6` (non-VRF, looking up in main table 254) is `table`. `vrftable` is the parameter used by `End.DT4` (VRF-aware IPv4 decap). Changed both `End.DT6` examples (single-node section and 3-node script) to use `table 254`. Left `End.DT4 vrftable 254` unchanged — that is correct.

6. **Nonsensical "ss7 filter" comment** — A comment above a tcpdump command read "Decode SRH with ss7 filter." SS7 is unrelated telecom signalling. Replaced with an accurate description of what the BPF expression `ip6[6]==43` matches (the IPv6 Next Header byte equalling the Routing Header type).

## Review Notes
- The `5f00::/16` SID address space used throughout the post matches the IANA reservation in RFC 9602 — good practice.
- `vrftable 254` for `End.DT6` does work on kernels with VRF support (5.11+), but `table 254` is the canonical and historically correct form for a non-VRF main-table lookup, so the change is more portable.
- The `tcpdump "ip6 proto 43"` filter is correct and robust; `ip6[6]==43` only matches when the Routing Header is the immediately following extension header (it would miss SRH that follows e.g. a Hop-by-Hop header). Both are kept since this is acknowledged as a quick-look filter.
- The 3-node example uses `End.X` on the transit node where a plain `End` would suffice given the segment list; this is a stylistic choice (adjacency SID semantics) and not technically wrong.
- The unused `LOCATOR` shell variable in the 3-node script is a minor cosmetic issue, not a technical error.
