# Validation Summary: How to Configure Static Routes with systemd-networkd - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Linux routing
- systemd-networkd
- systemd `.network` files
- IPv4 static routes
- IPv6 static routes
- iproute2 `ip route`
- `routel`

## Sources Consulted
- systemd.network official manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd-networkd route parser source: https://github.com/systemd/systemd/blob/v258/src/network/networkd-route.c
- systemd IP address parsing source: https://github.com/systemd/systemd/blob/v258/src/basic/in-addr-util.c
- ip-route manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- routel manual page: https://man7.org/linux/man-pages/man8/routel.8.html
- Local systemd 255 `systemd.network(5)` manual page
- Local iproute2 6.1.0 `ip-route(8)` manual page

## Issues Found
- The basic static route example used `Gateway=10.10.0.1` while the interface address was `192.168.1.100/24`. By default, `systemd-networkd` requires route gateways to be reachable on the link unless `GatewayOnLink=true` is configured. Changed the route gateway to `192.168.1.254`, which is on the configured subnet.
- The route metric example used `Destination=default`. `ip route` accepts `default` as a route prefix, but `systemd-networkd` parses `Destination=` as an IP prefix and does not document or parse `default` there. Changed both default-route destinations to `Destination=0.0.0.0/0`.
- The second metric example used `Gateway=192.168.2.1`, which would be off-link for the surrounding `192.168.1.100/24` example. Changed it to `Gateway=192.168.1.254`.
- The temporary route removal command used the old off-link gateway. Updated it to match the corrected route gateway.

## Review Notes
The post is now technically correct for current systemd-networkd syntax. In future revisions, it could mention `GatewayOnLink=true` for advanced off-link gateway configurations, but that is not required for the corrected examples.
