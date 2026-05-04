# Validation Summary: How to Configure IPv6 Routing on FreeBSD

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- FreeBSD (route(8), netstat, sysctl, rc.conf, loader.conf, service)
- IPv6 networking (static routes, default routers, link-local zone IDs, forwarding)
- FreeBSD multi-FIB policy routing (setfib(1))
- FRR (Free Range Routing) — OSPFv3 (ospf6d)

## Sources Consulted
- FreeBSD route(8) man page — https://man.freebsd.org/cgi/man.cgi?query=route&sektion=8
- FreeBSD rc.conf(5) man page — https://man.freebsd.org/cgi/man.cgi?query=rc.conf&sektion=5
- FreeBSD netstat(1) man page — https://man.freebsd.org/cgi/man.cgi?query=netstat&sektion=1
- FreeBSD setfib(1) man page — https://man.freebsd.org/cgi/man.cgi?query=setfib&sektion=1
- FreeBSD Handbook — Advanced Networking — https://docs.freebsd.org/en/books/handbook/advanced-networking/
- FRR ospf6d documentation — https://docs.frrouting.org/en/latest/ospf6d.html
- FreeBSD ports tree — net/frr rc.d script — https://github.com/freebsd/freebsd-ports/blob/main/net/frr10/files/frr.in

## Issues Found

1. **`route -6 show` listed as a way to view the routing table.** On FreeBSD, `route(8)`'s `show` subcommand is documented as "another name for the get command" — it requires a destination and looks up a single route, it does not list the entire table. Replaced with `route -6 get 2001:4860:4860::8888` to demonstrate the correct usage. (`netstat -rn -f inet6` remains the way to list all IPv6 routes, which the post already shows.)

2. **Invalid FRR ospf6d.conf syntax with nested `area` block containing `interface` directives.** The original snippet used:
   ```
   router ospf6
     area 0.0.0.0
       interface em0 area 0.0.0.0
   ```
   Per the FRR documentation, interface-to-area assignment is done in a top-level `interface` block via `ipv6 ospf6 area <id>`; the `area` block under `router ospf6` is for area-wide settings (range, stub, filtering), not interface assignment. Rewrote the config to the canonical FRR form using top-level `interface` blocks with `ipv6 ospf6 area 0.0.0.0` and added a `router-id`.

3. **Misleading comment "Configure in /etc/rc.conf:" preceded a write to `/boot/loader.conf`.** Updated the comment to correctly describe loader.conf and note that a reboot is required for `net.fibs` to take effect (it is a tunable, not runtime-settable).

## Review Notes

- Verified correct: `ipv6_defaultrouter`, `ipv6_static_routes`, `ipv6_route_<name>`, `ipv6_gateway_enable="YES"`, and `service routing restart` — all standard rc.conf/rc.d mechanisms documented in rc.conf(5).
- Verified correct: `frr_enable="YES"` and `frr_daemons="ospf6d"` — these are the actual rc.conf knobs used by the FreeBSD `net/frr` port's rc.d script (the `/etc/frr/daemons` file is a Debian/systemd convention and is not used by the FreeBSD port).
- Verified correct: `net.fibs` in `/boot/loader.conf` (loader tunable, capped at 16; often paired with `net.add_addr_allfibs=0`).
- Verified correct: link-local zone-ID syntax `fe80::1%em0` for `route -6 add default`.
- `ping6` and `traceroute6` still exist on modern FreeBSD; on FreeBSD 13+, `ping -6` is also supported, but `ping6` remains valid.
- No version-specific caveats added since the post does not target a specific FreeBSD release; the corrected commands work on supported FreeBSD versions (13.x, 14.x).
