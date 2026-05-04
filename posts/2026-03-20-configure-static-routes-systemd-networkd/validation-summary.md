# Validation Summary: How to Configure Static Routes with systemd-networkd

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- systemd-networkd
- systemd `.network` configuration files
- Linux IP routing (`ip route`)
- `networkctl` CLI

## Sources Consulted
- `systemd.network(5)` man page (https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html)
- `networkctl(1)` man page (https://www.freedesktop.org/software/systemd/man/latest/networkctl.html)
- `ip-route(8)` man page

## Issues Found
No technical issues found.

Verified items:
- `[Match]` and `Name=` directives — correct.
- `[Network]` section: `Address=` and `Gateway=` directives — `Gateway=` in `[Network]` is documented as a short-hand for a `[Route]` section containing only `Gateway=`, so the post's note about it is accurate.
- `[Route]` section keys used: `Destination=`, `Gateway=`, `Metric=`, `PreferredSource=`, `Type=` — all valid per `systemd.network(5)`.
- `Type=blackhole` — valid value (the full set is unicast, local, broadcast, anycast, multicast, blackhole, unreachable, prohibit, throw, nat, xresolve).
- `Metric=` accepts an unsigned integer (0..4294967295); lower values have higher priority — correctly described.
- Default route via `Destination=0.0.0.0/0` — correct.
- Host route `/32` — correct.
- `networkctl reload` — valid subcommand (added in systemd 248) for reloading `.network` / `.netdev` files.
- `systemctl restart systemd-networkd` — valid alternative.
- `ip route show`, `ip route show 192.168.50.0/24`, `networkctl status eth0` — all correct.

## Review Notes
- `Gateway=` in `[Network]` is documented as a shortcut for a `[Route]` section, so both styles in the post are valid. The post's recommendation to use a `[Route]` section with `Destination=0.0.0.0/0` for "more control" is reasonable, especially when additional route options (Metric=, Table=, PreferredSource=) are needed.
- Minor possible improvement (not an error): For complete examples, a `[Route]` section nested inside the `[Network]` section is invalid — `[Route]` must always be its own top-level section. The post correctly uses separate sections, so this is fine.
- No version-specific caveats beyond the `networkctl reload` note above.
