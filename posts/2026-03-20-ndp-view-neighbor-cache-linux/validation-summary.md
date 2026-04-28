# Validation Summary: How to View the IPv6 Neighbor Cache on Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Linux `ip` command (iproute2)
- `ip -6 neigh show` neighbor cache management
- NUD (Neighbor Unreachability Detection) states
- Python `subprocess` for parsing CLI output

## Sources Consulted
- `man ip(8)` — iproute2 ip utility options
- `man ip-neighbour(8)` — neighbour/arp tables management
- iproute2 source behavior verified locally (`ip -6 neigh show`, `ip -6 -r neigh show`)
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)

## Issues Found

1. **Broken `-n` flag usage.** The post had `ip -6 -n neigh show` with comment "Show with numeric output (no hostname resolution)". This is incorrect: `-n` is the iproute2 short form of `-netns` and requires a network namespace name as its argument. Running the command literally produces `Cannot open network namespace "neigh": No such file or directory`. Additionally, IPv6 addresses in `ip neigh show` output are already numeric by default — hostname resolution must be explicitly opted into with `-r`. Fixed by changing to `ip -6 -r neigh show` with the comment "Resolve hostnames (numeric is the default)", which is the actually useful, complementary operation.

2. **Misleading "routers" grep.** The post had `ip -6 neigh show | grep "fe80::"` with comment "Find all routers in neighbor cache (link-local with REACHABLE state)". `fe80::` link-local addresses are present on every IPv6 host, not just routers, and the grep does not filter on REACHABLE state at all. The kernel actually flags router neighbors in the output with the literal `router` keyword (verified locally and in iproute2 source). Fixed by changing the command to `ip -6 neigh show | grep router` with comment "Find all router neighbors (entries with the 'router' flag)".

## Review Notes
- The example output line `2001:db8::3 dev eth0 lladdr 00:aa:bb:cc:dd:ee FAILED` shows a FAILED entry with an lladdr; in practice FAILED entries usually have no lladdr (the resolution attempts exhausted), but a lingering lladdr is technically possible during the FAILED window, so the example is acceptable.
- The Python NUD-state list is complete enough for monitoring purposes; it omits `NONE` (a transient pseudo-state per `man ip-neighbour`), which is fine in practice since entries are rarely observed in that state.
- `ip -6 neigh show 2001:db8::1 dev eth0` works because `to ADDRESS` is the default in the show syntax — the `to` keyword is implicit.
- The introduction's analogy to ARP is accurate; on Linux both IPv4 ARP and IPv6 NDP entries live in the same kernel neighbour table and are managed via the same `ip neigh` command.
