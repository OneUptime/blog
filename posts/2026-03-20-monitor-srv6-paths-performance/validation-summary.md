# Validation Summary: How to Monitor SRv6 Paths and Performance - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- BFD (Bidirectional Forwarding Detection)
- FRR (FRRouting) — BFD and IS-IS configuration
- Python 3 (subprocess, ICMPv6 probing)
- iputils `ping6` and `traceroute6`
- Linux kernel SRv6 encap (`ip -6 route ... encap seg6`)
- gRPC / gNMI streaming telemetry
- gnmic (open-source gNMI client)
- Cisco IOS-XR SRv6 YANG operational models

## Sources Consulted
- FRR documentation: BFD daemon — https://docs.frrouting.org/en/latest/bfd.html
- FRR documentation: ISISd — https://docs.frrouting.org/en/latest/isisd.html
- RFC 9602 — Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture (IANA `5f00::/16` SRv6 SID prefix)
- IANA IPv6 Special-Purpose Address Registry
- Linux `ip-route(8)` man page — `ENCAP_SEG6` syntax
- gnmic docs — global flags and `subscribe` subcommand flags (`--address`, `--stream-mode`, `--sample-interval`)
- Cisco IOS-XR SRv6 YANG models (YangModels/Cisco GitHub, IOS-XR 7.x)
- Python 3 `datetime` documentation — `utcnow()` deprecation in 3.12+

## Issues Found
1. **Incorrect FRR IS-IS BFD configuration syntax.** The original snippet placed `interface eth0` and `bfd` inside `router isis CORE`, which is not valid in FRR. Per FRR's ISISd documentation, BFD on an IS-IS-enabled interface is configured under the global `interface` block using `isis bfd`. Replaced the block with the canonical form:
   ```
   interface eth0
     ipv6 router isis CORE
     isis bfd
   !
   ```
   (Used `ipv6 router isis` since the surrounding context is SRv6/IPv6.)

2. **Deprecated `datetime.utcnow()`.** Python 3.12 deprecates `datetime.utcnow()` in favor of timezone-aware `datetime.now(timezone.utc)`. Updated the import to also bring in `timezone` and changed the timestamp call to `datetime.now(timezone.utc).isoformat()`, which produces a timezone-aware ISO 8601 string rather than a naive UTC value.

## Review Notes
- The BFD multihop peer block syntax in FRR's `frr.conf` is correct, including `peer <ipv6> multihop local-address <ipv6>` and the `receive-interval` / `transmit-interval` / `detect-multiplier` sub-commands.
- The SRv6 SID prefix `5f00::/16` is correctly used per RFC 9602 / IANA registry.
- The Linux `ip -6 route add ... encap seg6 mode encap segs ... dev ...` syntax matches `ip-route(8)`.
- The `gnmic subscribe` command flags (`--address`, `--path`, `--mode stream`, `--stream-mode sample`, `--sample-interval`) are all valid.
- The Cisco IOS-XR YANG path `Cisco-IOS-XR-segment-routing-srv6-oper:srv6/active/locators/locator/sids/sid` matches the IOS-XR 7.x SRv6 oper-YANG module shape.
- `grpc-telemetry-client` is not a real CLI tool — it's used illustratively to show the conceptual subscription before the real `gnmic` example. Readers should rely on the `gnmic` block (or tools like Telegraf's `cisco_telemetry_mdt` plugin / Cisco's `pipeline`) for an actual implementation. Left as-is since the surrounding gnmic example provides a working alternative and rewriting would change post structure.
- `ping6` is a deprecated alias in modern iputils (use `ping -6` or `ping`), but the `ping6` symlink is still shipped on all major distros and works correctly. Left unchanged.
- The RTT-extraction regex matches Linux iputils ping output (`rtt min/avg/max/mdev = ...`). It would not match BSD/macOS ping (`round-trip min/avg/max/stddev`), which is acceptable given the surrounding Linux-focused tooling.
- `sr-traceroute` is hedged with "if available"; this is reasonable since SRv6-aware traceroute tooling is not yet a standardized utility.
