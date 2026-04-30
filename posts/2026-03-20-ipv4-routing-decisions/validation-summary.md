# Validation Summary: How to Understand How IPv4 Routing Decisions Are Made

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 routing
- Linux routing policy database (`ip rule`)
- Linux routing tables and `ip route`
- Equal-Cost Multi-Path (ECMP)
- Python `ipaddress`

## Sources Consulted
- RFC 1812, "Requirements for IP Version 4 Routers": https://www.rfc-editor.org/rfc/rfc1812
- `ip-rule(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Local command help verified in the review environment: `ip route help`, `ip rule help`

## Issues Found
- The post described Linux as checking whether a destination is local before route lookup. I changed this to explain that Linux route lookup starts with the routing policy database and that the built-in rule with priority `0` looks up the `local` table first, because that is how Linux documents the lookup order.
- The `ip route show table local` explanation implied the table only lists local interface IPs. I corrected it to note that the `local` table contains local and broadcast routes for addresses assigned to the host.
- The metric tiebreaker wording was too broad. I changed it to say that, in the same table, routes with the same prefix length prefer the lower metric, matching the Linux `ip-route(8)` definition of route preference.
- The ECMP section implied Linux automatically load-balances whenever two same-prefix routes share a metric. I corrected this to state that ECMP applies when equal-cost nexthops are configured as a multipath route, which is what the `ip route ... nexthop ...` syntax actually creates.
- The source-address section implied `src` is part of route matching. I changed it to say that, once a route is selected, Linux can use the route's `src` value as the preferred source address.

## Review Notes
- The longest-prefix-match explanation and Python example were technically correct and consistent with RFC 1812 and Python's `ipaddress` module.
- The post is now accurate for Linux, but some details such as the routing policy database and the `local` table are Linux-specific rather than universal across all routers.
