# Validation Summary: How to Configure Network Routing Tables and Static Routes on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager
- nmcli
- iproute2 (`ip route`, `ip rule`)
- IPv4 and IPv6 static routes
- Policy-based routing
- NetworkManager keyfile profiles

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a static route - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-static-routes_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Configuring policy-based routing to define alternative routes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-policy-based-routing-to-define-alternative-routes_configuring-and-managing-networking
- NetworkManager Reference Manual: nm-settings-nmcli - https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local `nm-settings-nmcli(5)` man page for `ipv4.routes`, `ipv4.routing-rules`, `ipv4.route-metric`, and `ipv4.never-default`.
- Local `nm-settings-keyfile(5)` man page for keyfile `routeN`, `routeN_options`, and `routing-ruleN` syntax.
- Local `ip-route(8)` man page for route display syntax and the Linux 3.6 IPv4 route cache note.

## Issues Found
- The keyfile example used two `[ipv4]` sections and placed `route1_options=table=100` after routes that were not the policy-routing default route. Updated the example to keep one `[ipv4]` section and added a `route3` default route with `route3_options=table=100`, so the route option applies to the intended route.
- The troubleshooting section recommended `ip route show cache` as if it would show useful route-cache entries. On RHEL 9 kernels, IPv4 route cache output is obsolete. Replaced it with `ip route show table all`, which is current and useful for static route and policy-routing troubleshooting.

## Review Notes
The `nmcli` examples for static IPv4 routes, IPv6 routes, route metrics, `ipv4.never-default`, and `ipv4.routing-rules` match the documented NetworkManager syntax. The PBR example's `/etc/iproute2/rt_tables` entry is optional when numeric table IDs are used, but it is a valid way to assign a readable table name.
