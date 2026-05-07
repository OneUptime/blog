# Validation Summary: How to Add a Blackhole Route on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel routing tables
- `iproute2` / `ip route`
- `ping`
- `systemd-networkd`
- ICMP route error behavior

## Sources Consulted
- Linux `ip-route(8)` manual page (Linux man-pages project / man7) - https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip route help` on the local system, used to confirm current CLI syntax for `add`, `del`, and `show type`
- `systemd.network(5)` documentation - https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- `man systemd.network` on the local system, used to confirm `[Route]` `Destination=` and `Type=blackhole`

## Issues Found
- The verification example said `ping` should show silent packet loss with no error messages. For a locally configured `blackhole` route, `ip-route(8)` states that local senders get `EINVAL`, so the example was corrected to expect an immediate `ping: connect: Invalid argument` failure instead of a timeout.
- The `unreachable` route row described the ICMP behavior as net unreachable. The current Linux route documentation describes it as generating `Host Unreachable`, so the table was corrected to match the documented behavior.
- The `prohibit` route row listed incorrect ICMP code values. Linux documents this route type as generating `Communication Administratively Prohibited`, so the table wording was corrected to that documented behavior.
- Directional wording in the use-case example and conclusion could imply source-based filtering. It was tightened to refer to traffic to destination prefixes, because a blackhole route matches destination prefixes.

## Review Notes
- The persistence example using `/etc/rc.local` is distribution-dependent and may not be enabled by default on modern systemd-based systems.
- The `systemd-networkd` example is valid when the interface is managed by `systemd-networkd`.
