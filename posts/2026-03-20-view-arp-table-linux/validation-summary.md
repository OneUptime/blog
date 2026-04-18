# Validation Summary: How to View the ARP Table on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking (ARP / neighbour table)
- `iproute2` (`ip neigh`, `ip monitor`)
- `net-tools` (legacy `arp` command)
- Bash / awk scripting
- Python `subprocess` module

## Sources Consulted
- `man ip-neighbour` (iproute2) — verified command syntax, NUD states, and show/filter options
- Live execution of `ip neigh show` and `ip neigh show nud all` on Linux 6.17 — verified output format and the `nud all` filter
- `man arp` (net-tools) — verified `-n`, `-a`, `-i` flag behavior
- Python 3 docs for `subprocess.run` with `capture_output=True, text=True` — verified current API usage
- Linux kernel neighbour subsystem documentation (RFC 826 for ARP concepts)

## Issues Found
No technical issues found.

Verification details:
- `ip neigh show` syntax, including `dev IFACE`, `nud STATE`, address filtering (the `to` keyword is optional), and `nud all` are all correct per iproute2 documentation.
- NUD states listed (REACHABLE, STALE, DELAY, PROBE, FAILED, PERMANENT, NOARP) match the kernel's defined states in `man ip-neighbour`.
- Sample outputs for both `ip neigh show` and `arp -n` match real-world output.
- The awk parsing (`$1` for IP, `$5` for MAC when filtered by REACHABLE|STALE) correctly aligns with the `ip neigh` output format `ADDR dev IFACE lladdr MAC STATE`.
- The Python script uses `subprocess.run` with current kwargs (`capture_output`, `text`) introduced in Python 3.7+, parses `parts[4]` (MAC) and `parts[-1]` (state) correctly, and the length check handles entries without an `lladdr` (FAILED/INCOMPLETE).
- `ip monitor neigh` and `watch -n 1 'ip neigh show'` are valid.

## Review Notes
- The Python script imports `re` but does not use it — harmless, but could be removed in a future cleanup.
- The post does not mention the `INCOMPLETE` or `NONE` NUD states; this is acceptable as they are rarely user-facing, though `INCOMPLETE` does appear for in-progress resolutions.
- The `arp` command from `net-tools` is officially deprecated on most modern distributions (Debian/Ubuntu, Fedora); the post correctly labels it as "legacy" and leads with `ip neigh`.
- The post focuses on IPv4 ARP. The `ip neigh` command also covers IPv6 NDP entries, which was not covered but is out of scope for an ARP-focused article.
