# Validation Summary: How to Add a Static Route for a Specific Source Address on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux policy routing
- iproute2 `ip rule`
- iproute2 `ip route`
- iputils `ping`
- systemd-networkd `.network` files
- Debian/ifupdown `/etc/network/interfaces`
- IPv4 routing tables

## Sources Consulted
- ip-rule(8), iproute2 manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- ip-route(8), iproute2 manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- ping(8), iputils manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- systemd.network(5), systemd upstream manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- interfaces(5), Debian ifupdown manual page: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- Local command/man-page checks: `ip rule help`, `ip route help`, `ping -h`, `man ip-rule`, `man systemd.network`

## Issues Found
- The first step said `ip rule add` created a separate routing table. `ip rule` adds a routing policy rule that looks up an existing numeric table; routes populate the table. Changed the comment to say the rule sends ISP2 source traffic to table 100.
- The manual and named-table examples added only the default route first, and the default route did not specify the output interface. Changed the examples to add the directly connected `10.0.0.0/24` route before the default route, and added `dev eth1` to the default route so the table is self-contained and matches the described interface.
- The systemd-networkd persistence snippet only persisted the default route in table 100. Added a `[Route]` entry for `10.0.0.0/24` in table 100 so the persistent configuration matches the manual routing table.
- The `/etc/network/interfaces` example used the deprecated `netmask` option. Replaced it with CIDR syntax in the `address` line, which is the current ifupdown form documented by Debian.
- The `/etc/network/interfaces` example added routes on interface up but only deleted the rule on interface down. Added matching route deletion commands to avoid leaving stale table 100 routes.

## Review Notes
- The one-off `ip rule add` example leaves priority selection to the kernel/iproute2 default. This is valid for the tutorial, but production configurations should normally set explicit unique rule priorities.
- The commands assume they are run with sufficient privileges to modify routes, routing policy rules, and system network configuration files.
