# Validation Summary: How to Add a Static Route with a Specific Metric on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux routing
- iproute2 / `ip route`
- Netplan
- NetworkManager / `nmcli`
- systemd-networkd

## Sources Consulted
- ip-route(8), iproute2 manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- systemd.network(5) manual: https://www.man7.org/linux/man-pages/man5/systemd.network.5.html
- RFC 1812, Requirements for IP Version 4 Routers, route lookup behavior: https://datatracker.ietf.org/doc/html/rfc1812#section-5.2.4.3

## Issues Found
- The post implied that Linux picks the lowest metric whenever multiple routes match. I changed this to clarify that longest-prefix route selection comes first, and metrics are used between equally specific routes.
- The `ip route replace ... metric 50` example was not a reliable way to change an existing route's metric because route preference/metric is part of the route key used by iproute2. I changed the example to delete the old metric route and add the route again with the new metric.
- The failover wording implied that Linux always falls back automatically when the primary interface fails. I narrowed this to the accurate case: Linux falls back when the lower-metric route is removed or otherwise unavailable.

## Review Notes
The remaining command and configuration examples are syntactically valid. The route examples assume the gateways are reachable through configured interfaces; otherwise `ip route add` may require an explicit `dev` or `onlink`/equivalent configuration depending on the network setup.
