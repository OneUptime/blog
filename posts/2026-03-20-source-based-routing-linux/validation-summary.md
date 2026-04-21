# Validation Summary: How to Configure Source-Based Routing on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux policy routing
- iproute2 `ip rule`
- iproute2 `ip route`
- `/etc/iproute2/rt_tables`
- ifupdown `/etc/network/interfaces`
- NetworkManager dispatcher scripts
- IPv4 routing

## Sources Consulted
- Linux `ip-rule(8)` manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- NetworkManager dispatcher reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-dispatcher.html
- Debian `interfaces(5)` manual page for ifupdown: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- Local `iproute2` documentation via `man ip-rule`, `man ip-route`, `ip rule help`, and `ip route help` on iproute2 6.1.0

## Issues Found
- The `ip rule add` examples did not set explicit priorities, but the sample `ip rule show` output showed the custom rules at priorities `100` and `200`. Updated the rule commands to include `priority 100` and `priority 200`, matching the `ip-rule(8)` guidance that rules should have explicit unique priorities.
- The policy rule comments said the commands matched the ISP subnets, but the commands match single source addresses (`203.0.113.5` and `198.51.100.5`). Updated the comments to describe interface-address matching.
- The sample `ip rule show` output omitted the default built-in `32767: from all lookup default` rule. Added it to match the default RPDB rules documented by `ip-rule(8)`.
- The persistence examples repeated `ip rule add` without explicit priorities. Updated those examples to use the same priorities as the main command sequence.

## Review Notes
- The core source-based routing workflow is technically correct for a multi-homed Linux host with per-interface source addresses.
- The persistence examples are distro-specific and intentionally brief. In production, configurations should also account for idempotency, cleanup of custom table routes, and distribution-native networking tools such as NetworkManager connection profiles or systemd-networkd where applicable.
- Multi-homed Linux hosts may also need reverse path filtering (`rp_filter`) reviewed, depending on the distribution defaults and traffic pattern.
