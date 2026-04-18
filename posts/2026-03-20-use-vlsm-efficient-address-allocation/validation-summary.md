# Validation Summary: How to Use VLSM for Efficient Address Allocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VLSM (Variable Length Subnet Masking)
- FLSM (Fixed Length Subnet Masking)
- IPv4 subnetting
- Python `ipaddress` standard library module
- Python `math` standard library module
- Classless routing protocols (OSPF, BGP, RIPv2, EIGRP)
- Classful routing protocols (RIPv1, IGRP)

## Sources Consulted
- Python `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html (IPv4Network, `strict=False` behavior, `subnet_of()` added in Python 3.7)
- Python `math` module docs: https://docs.python.org/3/library/math.html (`math.log2`, `math.ceil`)
- RFC 1878 — Variable Length Subnet Table For IPv4
- RFC 2453 — RIP Version 2 (supports VLSM / carries subnet mask)
- RFC 1058 — RIP Version 1 (classful, no mask in updates)
- Cisco documentation on IGRP (classful) vs EIGRP (classless)
- Executed the sample Python code locally to verify output

## Issues Found
No technical issues found.

Verification details:
- Prefix math: 100 hosts → /25 (126 usable), 50 → /26 (62), 20 → /27 (30), 2 → /30 (2) — all correct (`2^n - 2 >= hosts`).
- `math.ceil(math.log2(hosts + 2))` correctly computes host bits, including exact-power-of-two cases (e.g. `hosts=2` → `log2(4)=2` → /30).
- `ipaddress.IPv4Network(addr, strict=False)` zero-fills host bits, so the "align to boundary" comment is accurate, and alignment holds because allocations are sorted largest-first.
- `IPv4Network.subnet_of()` exists (added in Python 3.7); confirmed via `hasattr`.
- Running the example code against `192.168.10.0/24` produced the expected non-overlapping allocations: `192.168.10.0/25`, `.128/26`, `.192/27`, `.224/28`, `.240/30`, `.244/30`.
- Routing-protocol classification is accurate: RIPv1 and IGRP are classful and do not carry prefix lengths; OSPF, BGP, RIPv2, and EIGRP are classless and support VLSM.

## Review Notes
- The phrase "FLSM (forced /24 for all): wastes thousands of addresses" is a slight hyperbole — four forced /24s for these four segments waste ~800 addresses, not thousands. Kept as-is since it's rhetorical rather than a technical claim.
- The `math.ceil(math.log2(hosts + 2))` formula degrades if `hosts == 0` (gives /31 with 0 usable, legal under RFC 3021 but unusual) or `hosts == 1` (gives /30 rather than a possibly-intended /31). Acceptable for a tutorial; not worth a code change.
- For very large `hosts` values, `math.log2` floating-point imprecision could theoretically nudge `ceil` up by one; not a concern at the subnet sizes shown.
- The allocator relies on largest-first sorting for boundary alignment. This is stated in the docstring and is correct, but readers attempting to adapt it to unsorted input should be aware the `strict=False` alignment could silently produce overlapping subnets.
