# Validation Summary: How to Use Python pyroute2 for IPv6 Routing on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- pyroute2
- Linux networking
- IPv6
- Netlink
- iproute2 / policy routing

## Sources Consulted
- pyroute2 Linux `IPRoute` documentation: https://docs.pyroute2.org/iproute_linux.html
- pyroute2 RTNL classes documentation: https://docs.pyroute2.org/iproute_intro.html
- pyroute2 general documentation and monitoring example: https://docs.pyroute2.org/general.html
- pyroute2 source for current `IPRoute.addr()`, `IPRoute.route()`, and `IPRoute.rule()` behavior: https://github.com/svinota/pyroute2/blob/master/pyroute2/iproute/linux.py
- pyroute2 source for IP target and CIDR parsing: https://github.com/svinota/pyroute2/blob/master/pyroute2/requests/common.py
- Linux `ip-route(8)` manual: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ip-rule(8)` manual: https://www.man7.org/linux/man-pages/man8/ip-rule.8.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- RFC 3849, IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The IPv6 address example used `socket.AF_INET6` without importing `socket`. I added the missing import so the snippet is runnable.
- The address-management snippet used `mask=64`. Current `pyroute2` still accepts `mask`, but its current implementation marks it as deprecated in favor of `prefixlen`, so I updated both address operations to `prefixlen=64`.
- Several example IPv6 prefixes were syntactically invalid because they used non-hex hextets such as `remote`, `custom`, and `vrf`. I replaced them with valid RFC 3849 documentation prefixes.
- The monitoring example started a daemon thread and then let the main program exit, so it would terminate immediately in normal script execution. I changed it to run the monitor function directly.
- The monitoring example filtered only on `family == AF_INET6`, which could also match non-route IPv6 RTNL messages. I updated it to filter specifically for `RTM_NEWROUTE` and `RTM_DELROUTE` events before printing route details.

## Review Notes
- The examples are Linux-specific and require sufficient privileges to modify addresses, routes, and rules, typically root or equivalent `CAP_NET_ADMIN` capability.
- `IPRoute.bind()` subscribes to RTNL notifications, so filtering by event type is important when the goal is route-only monitoring.
