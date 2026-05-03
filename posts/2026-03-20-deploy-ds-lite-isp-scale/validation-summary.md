# Validation Summary: How to Deploy DS-Lite at ISP Scale

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- DS-Lite (Dual-Stack Lite, RFC 6333)
- IPv6 transition mechanisms
- AFTR (Address Family Transition Router)
- B4 (Basic Bridging BroadBand element)
- ISC AFTR daemon
- Cisco IOS DS-Lite AFTR configuration
- OpenWRT `dslite` proto (B4 client)
- Kea DHCPv6 server (AFTR-Name option, RFC 6334)
- Carrier-grade NAT (NAPT)
- Linux conntrack / iptables / `ip -6 tunnel`

## Sources Consulted
- RFC 6333 — Dual-Stack Lite Broadband Deployments Following IPv4 Exhaustion (https://datatracker.ietf.org/doc/html/rfc6333)
- RFC 6334 — DHCPv6 Option for Dual-Stack Lite (https://datatracker.ietf.org/doc/html/rfc6334)
- RFC 6888 — Common Requirements for Carrier-Grade NATs (https://datatracker.ietf.org/doc/html/rfc6888)
- Jool official documentation (https://nicmx.github.io/Jool/) and GitHub (https://github.com/NICMx/Jool)
- ISC AFTR project page (https://www.isc.org/aftr/)
- OpenWRT `ds-lite` package source (`package/network/ipv6/ds-lite/files/dslite.sh`)
- Cisco IOS / IOS-XE tunnel mode reference (Interface and Hardware Component Configuration Guide)

## Issues Found

1. **Jool does not implement DS-Lite (corrected).** The original post showed deploying a Linux AFTR using Jool with commands like `modprobe jool_siit` and `jool_siit instance add "aftr" --iptables`. Jool is documented as "An SIIT and a NAT64 for Linux" (with MAP-T support added later) — it does not implement DS-Lite tunneling. Replaced the Jool example with the actual ISC AFTR daemon (`aftr -c /etc/aftr.conf`) referenced by the same paragraph, with a representative `aftr.conf` and a note that ISC AFTR is reference software while production deployments typically use a carrier-grade vendor implementation.

2. **Cisco `tunnel mode ipv6ip` is the wrong direction (corrected).** Cisco's tunnel mode convention is `<passenger> <transport>`, so `tunnel mode ipv6ip` means IPv6-over-IPv4 (6in4 / RFC 4213) — the opposite of what a DS-Lite AFTR needs. DS-Lite carries IPv4-in-IPv6 from the B4 to the AFTR. Changed to `tunnel mode ipv6` (IPv4-over-IPv6 manual tunnel) and added a clarifying inline comment that the interface terminates the IPv4-in-IPv6 softwire.

3. **Per-subscriber session count was ~5× typical (corrected).** The original "plan for ~10,000 sessions per subscriber" sizing guidance is well above industry practice. RFC 6888 requires per-subscriber port limits but does not mandate a number; common operator deployments (Comcast, BT, A+P research, etc.) provision roughly 1,000–2,000 ports per subscriber, with 2,048 a frequent default. 10,000 would defeat much of CGN's address-sharing benefit. Updated to "~1,000-2,000 sessions per subscriber (RFC 6888 baseline)."

## Review Notes
- RFC 6333 specifics verified as correct: B4 = "Basic Bridging BroadBand element"; AFTR = "Address Family Transition Router"; well-known IPv4 prefix 192.0.0.0/29 with 192.0.0.1 = AFTR and 192.0.0.2 = B4 (the post does not contradict these).
- DHCPv6 option code 64 for `aftr-name` is correct per RFC 6334 §6.
- The Kea DHCPv6 snippet defines `aftr-name` via `option-def` for clarity — Kea actually ships `aftr-name` as a built-in standard option, so the `option-def` block is redundant but not incorrect.
- The OpenWRT `dslite` proto with `peeraddr` was verified against the upstream `package/network/ipv6/ds-lite/files/dslite.sh` and is correct.
- The Cisco IOS AFTR snippet remains an illustrative simplification — real Cisco IOS-XE / IOS-XR DS-Lite AFTRs are typically configured under CGN/`nat44 ds-lite` features rather than a generic Virtual-Template tunnel. The post is clear that this is illustrative configuration.
- ISC AFTR is no longer actively maintained; future revisions of this post may want to lean on VPP's DS-Lite plugin or a vendor implementation as the recommended Linux-side reference.
- `ip -6 tunnel show | grep ds-lite` only matches if the operator named their tunnel interface containing the string "ds-lite"; on many systems the tunnel device will be `ip6tnl0` or similar. Left as-is since it's contingent on local naming conventions.
