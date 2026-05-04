# Validation Summary: How to Configure Unbound to Listen on IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Unbound DNS resolver (`unbound.conf`, `unbound-checkconf`, `unbound-control`)
- IPv6 networking (link-local, ULA, global addressing)
- `dig` (BIND DNS lookup utility)
- `ss` (socket statistics)
- `ip6tables` and `iptables-persistent`
- `systemd` unit management for the unbound service

## Sources Consulted
- Unbound `unbound.conf(5)` man page / NLnet Labs docs: https://nlnetlabs.nl/documentation/unbound/unbound.conf/
- Unbound `unbound-control(8)` documentation: https://nlnetlabs.nl/documentation/unbound/unbound-control/
- BIND 9 `dig(1)` man page (verified `+identify` only takes effect with `+short`)
- Debian wiki / `iptables-persistent` package layout (rules stored at `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`)
- RFC 4193 (Unique Local IPv6 Unicast Addresses) for the ULA range
- Google Public DNS documentation for IPv6 resolver addresses (`2001:4860:4860::8888`, `::8844`)

## Issues Found
1. **`dig +identify` used without `+short`** — In BIND's `dig`, `+identify` only emits the responding server's address/port when `+short` is also enabled; without `+short` it silently does nothing (the default long-form output already prints a `SERVER:` line). Updated the example to `dig A example.com @::1 +short +identify` and clarified the comment.
2. **Wrong path for persisted ip6tables rules** — The post wrote `/etc/ip6tables/rules.v6`, but the `iptables-persistent` package on Debian/Ubuntu stores both v4 and v6 rule files under a single `/etc/iptables/` directory. Corrected the redirect target to `/etc/iptables/rules.v6` and added a brief note.
3. **`unbound-control dump_cache` used to diagnose access-control issues** — `dump_cache` prints cached RRsets and tells you nothing about ACLs. Replaced with `unbound-checkconf` plus a `grep` of `access-control:` lines in `unbound.conf`, which actually answers the troubleshooting question.

## Review Notes
- `interface: ::0` is valid Unbound syntax and is even used in the upstream `unbound.conf(5)` example, so it was left as-is (equivalent to `::`).
- `access-control: ::1 allow` (without `/128`) is accepted by Unbound — a bare address is treated as a host route — but `::1/128 allow` is more explicit. The post mixes both styles; left unchanged since both parse correctly.
- `fd00::/8` is technically only the locally-assigned half of the RFC 4193 ULA range (`fc00::/7`). It is a common practical shortcut because `fc00::/8` is currently unassigned, so left unchanged. A future revision could note this nuance.
- `do-ip6: yes` defaults to `yes` in modern Unbound; setting it explicitly is harmless and improves clarity.
- Google Public DNS IPv6 addresses (`2001:4860:4860::8888` / `::8844`) are correct.
