# Validation Summary: How to View IPv6 Routes with ip -6 route

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux `iproute2` suite (`ip` command)
- IPv6 routing
- Router Advertisements (RA)
- ECMP / multipath routing
- Network debugging on Linux

## Sources Consulted
- iproute2 `ip route help` and `ip -6 route help` output (verified locally)
- `ip-route(8)` man page
- RFC 4191 (Default Router Preferences — `pref` attribute values `low`/`medium`/`high`)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — `2001:db8::/32`)
- Kernel documentation for `rtnetlink` / IPv6 FIB

## Issues Found

1. **Invalid `ip route count` subcommand.** The "Comparing IPv4 and IPv6 Routing Tables" section used `ip route count`, which is not a valid iproute2 subcommand (confirmed via `ip route help`; running it yields `Command "count" is unknown`). Replaced with `ip route show | wc -l` to match the symmetric IPv6 line already using that pattern.

2. **Invalid hex in IPv6 placeholder addresses.** Multiple examples used IPv6 addresses containing non-hex characters (e.g., `2001:db8:remote::/48`, `2001:db8::gateway`, `2001:db8::backup`, `2001:db8::gw1`, `2001:db8::gw2`, `2001:db8::target`). Only `0-9` and `a-f` are valid in an IPv6 address field, so any of these commands would fail with `Error: inet6 prefix is expected rather than …` or a similar parse error. Replaced with valid hex placeholders within the RFC 3849 documentation range: `2001:db8:abcd::/48`, `2001:db8::1`, `2001:db8::2`, `2001:db8::a1`, `2001:db8::a2`, `2001:db8::cafe`.

## Review Notes
- `pref medium` output and the `low`/`medium`/`high` values listed for the `pref` field correctly reflect RFC 4191 route preference semantics as surfaced by iproute2.
- `ip -6 route show scope {global,link,host}` is syntactically accepted by iproute2, though in practice most IPv6 routes fall under the global (universe) scope, so `scope link` / `scope host` may return fewer entries than the IPv4 equivalents. Not incorrect, just a behavioral nuance worth keeping in mind.
- The `proto` list (`kernel`, `static`, `ra`, `dhcp`, `bird`, `ospf`) mixes well-known iproute2 built-ins with daemon-registered protocols from `/etc/iproute2/rt_protos`. That's fine, but on a minimal system some of those names (e.g., `bird`, `ospf`) will only resolve if the relevant daemon packages have registered them.
- `ip -j -6 route show` JSON output is supported in modern iproute2 (≥ 4.x) — should work on essentially any currently supported distro.
