# Validation Summary: How to Add a Static Route on Arch Linux Using systemd-networkd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Arch Linux
- systemd-networkd
- systemd `.network` files
- systemd-resolved
- Linux IPv4 routing
- Policy routing
- `networkctl`
- `ip route`

## Sources Consulted
- systemd.network(5), Arch Linux manual pages: https://man.archlinux.org/man/systemd.network.5.en
- systemd-networkd.service(8), Arch Linux manual pages: https://man.archlinux.org/man/systemd-networkd.service.8.en
- networkctl(1), Arch Linux manual pages: https://man.archlinux.org/man/networkctl.1.en
- systemd.syntax(7), Arch Linux manual pages: https://man.archlinux.org/man/systemd.syntax.7.en
- systemd-resolved.service(8), Arch Linux manual pages: https://man.archlinux.org/man/systemd-resolved.service.8.en
- ip-route(8), Arch Linux manual pages: https://man.archlinux.org/man/ip-route.8.en
- ip-rule(8), Arch Linux manual pages: https://man.archlinux.org/man/ip-rule.8.en

## Issues Found
- The introduction said Arch Linux "typically uses systemd-networkd." That overstates the default installed-system behavior. I changed it to say Arch Linux can use systemd-networkd, and that routes are defined in `.network` files when systemd-networkd manages the interface.
- Several `.network` snippets used inline comments after values such as `Metric=100    # Lower metric = higher priority`, `Table=100     # Add to routing table 100`, and `Scope=link    # On-link: route directly without gateway`. systemd.syntax(7) documents comments as lines starting with `#` or `;`, so inline comments can be parsed as part of the value and break numeric or enum settings. I moved those comments to separate lines.
- The debugging section described `networkctl list` as listing network files. networkctl(1) documents `list` as showing links and their status, so I changed the comment to match the command.

## Review Notes
The route directives, routing policy rule example, route metrics, table assignment, `networkctl reload`, `networkctl status`, `ip route show`, and `ip route get` usage were consistent with the current Arch Linux systemd and iproute2 manual pages. The DNS setup using systemd-resolved and a symlink to `/run/systemd/resolve/stub-resolv.conf` is consistent with the recommended systemd-resolved resolv.conf mode.
