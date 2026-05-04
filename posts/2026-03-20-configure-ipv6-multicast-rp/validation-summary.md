# Validation Summary: How to Configure IPv6 Multicast Rendezvous Points

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 multicast (PIM-SMv6)
- FRRouting (FRR) `pim6d` daemon and `vtysh` CLI
- Static RP configuration
- PIMv6 Bootstrap Router (BSR) and Candidate-RP
- Embedded RP (RFC 3956)
- Anycast RP for IPv6 (RFC 4610)
- MSDP (RFC 3618) — referenced for contrast (IPv4-only)
- Python 3 `socket` API for IPv6 multicast send testing

## Sources Consulted
- FRR PIMv6 user docs: https://docs.frrouting.org/en/latest/pimv6.html
- FRR `doc/user/pimv6.rst` on master: https://raw.githubusercontent.com/FRRouting/frr/master/doc/user/pimv6.rst
- FRR `pimd/pim6_cmd.c` and `pimd/pim_cmd_common.c` (BSR candidate-RP DEFPYs)
- RFC 3956 — Embedded-RP Address in IPv6 Multicast Address (https://datatracker.ietf.org/doc/html/rfc3956)
- RFC 3618 — Multicast Source Discovery Protocol (https://datatracker.ietf.org/doc/html/rfc3618)
- RFC 4610 — Anycast-RP Using Protocol Independent Multicast (https://datatracker.ietf.org/doc/html/rfc4610)

## Issues Found

1. **FRR command location wrong (top-level `ipv6 pim ...` vs. `router pim6` context).**
   In current FRR, all PIMv6 RP/BSR/Embedded-RP config commands live inside the
   `router pim6` configuration block, not as top-level `ipv6 pim ...` commands.
   Fixed in the Static RP, BSR, and Embedded-RP sections by wrapping the
   commands in `router pim6` / `exit`. The interface-level `ipv6 pim` (used to
   enable PIM neighborships on a link) is correct and was kept.

2. **`ipv6 pim rp <addr> [<group>]` rewritten to `rp <addr> [<group>]`.**
   Inside `router pim6`, the keyword is just `rp`. Updated in the Static RP
   section and in the Summary.

3. **BSR candidate-bsr / candidate-rp syntax.**
   The original used `ipv6 pim bsr candidate-bsr <addr> priority N` with the
   address inline. The actual FRR syntax (per `pim6_cmd.c`) is
   `bsr candidate-bsr [priority (0-255)] [source [address X:X::X:X] | [interface ...] | [loopback] | [any]]`
   — the address is supplied via the `source address` keyword pair, not bare.
   Same correction for `candidate-rp`. Fixed.

4. **`bsr candidate-rp` does not take `group-list` inline.**
   The original used `ipv6 pim bsr candidate-rp <addr> group-list ff3e::/32 priority 10`.
   In FRR pim6d, group ranges are advertised via a separate, repeatable
   command: `bsr candidate-rp group X:X::X:X/M`. Fixed by splitting the
   command into the candidate-rp enable line and a separate
   `bsr candidate-rp group ff3e::/32` line.

5. **Misleading BSR priority comment.**
   The original comment said "lower priority = backup BSR" which is correct
   in outcome but confusing without the rule. Reworded to state explicitly
   that BSR election picks the highest priority value, so a lower-priority
   candidate is the backup.

6. **Embedded-RP enable command was wrong.**
   Original: `ipv6 pim rp embedded`. The actual FRR command is
   `embedded-rp` (single token) under `router pim6`. Fixed.

7. **Embedded-RP layout description was confused.**
   The original text
   `ff7<scope>:0<RP prefix length><RP prefix len>:<RP address low 32 bits>:<group ID>`
   repeats "RP prefix length" twice and incorrectly labels the 64-bit
   prefix field as "RP address low 32 bits". Replaced with a description
   matching RFC 3956: 4-bit reserved (0), 4-bit RIID, 8-bit plen, then a
   64-bit network prefix and a 32-bit group ID, plus a one-paragraph
   description of how to reconstruct the RP address from those fields.

8. **Embedded-RP example was not self-consistent.**
   Original: RP `2001:db8:1::1` with embedded group `ff7e:0240:2001:db8:1::1:beef`.
   The byte at offset 2 (`02`) encodes RIID = 2, so the RP this group
   actually decodes to is `2001:db8:1::2`, not `::1`. Fixed by changing the
   group to `ff7e:0140:2001:db8:1::1:beef` (RIID = 1), which is consistent
   with the stated RP address.

9. **MSDP for IPv6 Anycast-RP is incorrect.**
   The original described configuring `router msdp` between IPv6 RPs.
   MSDP (RFC 3618) is defined for IPv4 only — its TLVs are explicitly
   IPv4 Source-Active TLVs — and FRR does not expose a `router msdp` mode
   for IPv6. The correct mechanism for IPv6 source synchronization between
   Anycast-RP peers is RFC 4610 ("Anycast-RP Using PIM"). Replaced the
   `router msdp` configuration block with a note explaining the v6 mechanism
   and the practical FRR setup (shared loopback address + identical RP
   config on all routers; RFC 4610 register-set forwarding is not currently
   exposed as a separate FRR knob).

10. **`show ipv6 pim rp-info <group>` is not a valid command form.**
    FRR's pim6d documents `show ipv6 pim [vrf NAME] rp-info [json]` only —
    no per-group filter argument. Removed that line and added the valid
    `show ipv6 pim bsr rp-info` (for BSR-learned mappings) and
    `show ipv6 pim bsr candidate-bsr` / `... candidate-rp` checks.

11. **`show ipv6 pim register-statistics` does not exist in FRR.**
    Replaced with `show ipv6 pim upstream`, which is the documented way to
    inspect (S,G) state at the RP and confirm source registration.

12. **Invalid IPv6 placeholders in Python test and verifier comment.**
    `ff3e::db8:test`, `ff3e::stream`, and `2001:db8::source` contain
    non-hex characters (`t`, `s`, `r`, etc.) and would not parse as IPv6
    addresses. Replaced with `ff3e::1234` (group) and `2001:db8::100`
    (source) so the example actually runs. Also lifted the `import time`
    out of the loop into the top-level `import socket, time` line for
    clarity.

## Review Notes

- The post still uses `2001:db8::1` (and similar) as documentation
  placeholders; readers must substitute real addresses on their network.
  These are valid IPv6 addresses (unlike the original `2001:db8::rp` /
  `2001:db8::bsr`, which were not).
- FRR's IPv6 BSR support landed in FRR 8.4 (2022) and the `router pim6`
  configuration mode is the current canonical form. Older FRR releases
  (pre-9.x and especially pre-8.4) may have accepted some of the original
  top-level `ipv6 pim ...` forms; the corrected commands target current
  master / recent stable releases.
- RFC 4610 "register-set" forwarding for full Anycast-RP source
  synchronization is not, at the time of writing, exposed as an explicit
  knob in FRR pim6d. Basic anycast RP behavior (closest-RP wins via IGP)
  works with the corrected configuration, which is what the post now
  describes.
- The post does not pin a specific FRR version. A future revision could
  state the minimum FRR release (8.4+ for BSR, current master for the
  BSR candidate-RP `group` sub-command form).
