# Validation Summary: How to Use VLSM to Efficiently Allocate IPv4 Address Space

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VLSM (Variable Length Subnet Masking)
- IPv4 subnetting / CIDR
- `ipcalc` CLI utility
- Python `ipaddress` standard library module

## Sources Consulted
- RFC 1878 — Variable Length Subnet Table For IPv4
- RFC 950 — Internet Standard Subnetting Procedure
- RFC 4632 — Classless Inter-domain Routing (CIDR)
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- `ipcalc(1)` man page (Jodies ipcalc): https://jodies.de/ipcalc
- Verified all subnet arithmetic using Python's `ipaddress.IPv4Network`

## Issues Found

1. **Incorrect `HostMax` value in `ipcalc` example for `10.10.1.0/25`.**
   - Original: `# HostMax: 10.10.1.127 (doesn't overlap with /24 above)`
   - Fixed to: `# HostMax: 10.10.1.126 (doesn't overlap with /24 above)`
   - Why: For `10.10.1.0/25`, the broadcast address is `10.10.1.127` and the last usable host (`HostMax`) is `10.10.1.126`. The original value confused the broadcast with HostMax. Verified with Python `ipaddress.IPv4Network('10.10.1.0/25').hosts()`.

## Review Notes

- All other subnet boundaries in the allocation table were verified correct: `10.10.0.0/24`, `10.10.1.0/25`, `10.10.1.128/26`, `10.10.1.192/27`, `10.10.1.224/28`, `10.10.1.240/30`, `10.10.1.244/30`, and the remaining `10.10.2.0/23`.
- The `10.10.0.0/22` usable host count (1022) and host-sizing reference table (/24=254, /25=126, /26=62, /27=30, /28=14, /30=2) are correct.
- The Python VLSM script was executed and produces output matching the example allocation exactly.
- Minor style observations (not corrected, as they are not technical errors):
  - In the script, `available = list(network.subnets(new_prefix=32))` creates a large unused list (1024 `/32` entries for a `/22`); it has no effect on correctness but is wasteful.
  - The docstring `"Return the smallest prefix length that fits n hosts."` is arguably ambiguous — strictly, the function returns the *largest* prefix length (i.e., smallest subnet) whose usable host count satisfies `n`. The code is correct; only the wording could be clearer.
- For two-host point-to-point WAN links, `/31` (per RFC 3021) is a common modern alternative to `/30`. The post's `/30` choice is traditional and correct, just worth noting for future readers.
