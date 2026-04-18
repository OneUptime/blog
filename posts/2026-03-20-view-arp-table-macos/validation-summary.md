# Validation Summary: How to View the ARP Table on macOS

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- macOS BSD `arp` command (IPv4 ARP cache)
- macOS `ndp` command (IPv6 neighbor cache)
- Homebrew (`brew install watch`)
- Python 3 (`subprocess`, `re`)
- Shell / Bash
- Comparison with Linux (`ip neigh`) and Windows (`arp`)

## Sources Consulted
- macOS `arp(8)` man page (BSD arp): https://ss64.com/mac/arp.html
- macOS `ndp(8)` man page (IPv6 neighbor discovery): https://ss64.com/mac/ndp.html
- Apple developer documentation / BSD networking commands
- Python 3 `subprocess` and `re` module documentation
- Homebrew `watch` formula: https://formulae.brew.sh/formula/watch

## Issues Found
No technical issues found. Specifically verified:
- `arp -a` and `arp -an` syntax and flag behavior on macOS (BSD arp).
- `-i interface` is a valid option with `-a` on macOS per the BSD arp synopsis.
- Sample output format (`hostname (IP) at MAC on iface ifscope [ethernet]`) matches BSD arp's output.
- `ndp -an` is correct for dumping the IPv6 neighbor cache numerically.
- Python regex `\((\d+\.\d+\.\d+\.\d+)\) at ([0-9a-f:]+) on (\S+)` correctly parses macOS arp lines, including MAC addresses where BSD strips leading zeros (e.g. `0:11:22:...`).
- `watch` is not built into macOS and must be installed via Homebrew.
- Comparison table entries for Linux (`ip neigh show`, `ip monitor neigh`, `ip neigh add`) and Windows (`arp -a`, `arp -s`) are accurate.

## Review Notes
- `arp -an -i any` is uncommon — `any` is not a standard macOS interface name, so that form relies on the `|| arp -an` fallback to still produce output. Plain `arp -an` already lists entries across all interfaces, so the `-i any` variant is effectively cosmetic. Not incorrect given the fallback, but could be simplified in a future revision.
- The sample-output line for the broadcast address (`192.168.1.255`) is shown with a `permanent` flag; in real captures, broadcast entries on macOS often appear without an explicit `permanent` label (that label is most commonly seen on static entries created via `arp -s ... ifscope ...`). This is illustrative sample output rather than a verbatim capture, and the surrounding explanation that `permanent` indicates a static entry is accurate.
- The post does not mention that `arp` is marked as a legacy utility on some BSD derivatives and that Apple has, in recent macOS releases, surfaced more functionality through `ndp` for IPv6. Current commands shown are still supported on modern macOS (Sonoma/Sequoia as of 2026-04).
