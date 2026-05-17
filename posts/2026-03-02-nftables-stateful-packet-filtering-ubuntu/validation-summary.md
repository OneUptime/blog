# Validation Summary: How to Configure nftables for Stateful Packet Filtering on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- nftables (nft v1.0.x)
- Linux kernel packet filtering (netfilter)
- Connection tracking (conntrack)
- Ubuntu 20.04+
- systemd (nftables.service)
- ICMP / ICMPv6

## Sources Consulted
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nft(8) manual page (verified locally with `nft --help` and `nft --version`)
- Debian/Ubuntu nftables package systemd unit (verified locally: `/lib/systemd/system/nftables.service`)
- Netfilter project documentation: https://www.netfilter.org/projects/nftables/
- Ubuntu package archive for `conntrack` and `nftables` packages
- Linux kernel changelog (nftables introduced in 3.13, January 2014)

## Issues Found

1. **Incorrect description of `nft list ruleset -a` flag** — the post claimed `-a` shows "rule hit counts (useful for verifying rules are matching)". The `-a` / `--handle` flag actually outputs rule handles, not hit counts. Counters require an explicit `counter` statement in the rule. Updated the comment to describe handles correctly and added a note that counters must be enabled in rules to view byte/packet counts via `nft list chain`.

2. **Incorrect path in the systemd `ExecStart` example** — the post said the service file should contain `ExecStart=/sbin/nft -f /etc/nftables.conf`. The actual nftables package on Ubuntu uses `/usr/sbin/nft -f /etc/nftables.conf` (verified locally). Updated the expected output to match.

## Review Notes

- The anonymous `meter flood { ip saddr limit rate 50/second }` syntax used in the rate-limiting section still works in current nftables versions but the upstream wiki notes the preferred approach in modern nftables is a named set with `flags dynamic`. Both syntaxes are functional; the post's syntax is fine for the typical use case shown.
- The `vmap { established: accept, related: accept, invalid: drop }` syntax is valid (nft accepts both spaced and unspaced `:` separator in verdict maps).
- The choice of `priority filter` (a named priority alias equivalent to 0 for filter chains) is correct and is the recommended modern style over a literal `0`.
- The ICMPv6 type allowlist (`nd-neighbor-solicit`, `nd-neighbor-advert`, `nd-router-advert`, `echo-request`) is appropriately permissive for IPv6 connectivity — these are required for Neighbor Discovery and SLAAC to function.
- The `tcp dport 22 ct state new limit rate 5/minute burst 10 packets accept` followed by `tcp dport 22 ct state new drop` pattern is the correct idiomatic way to implement a hard rate cap (the `limit` statement matches only when within the rate; excess packets fall through to the drop rule).
- `nftables` was indeed introduced in Linux kernel 3.13 (Jan 2014) and Ubuntu 20.04+ uses it as the default backend (via `iptables-nft`); both factual claims verified.
