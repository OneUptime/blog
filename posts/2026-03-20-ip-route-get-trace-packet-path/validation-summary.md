# Validation Summary: How to Use ip route get to Trace Packet Path

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2`
- `ip route`
- policy routing
- `traceroute`

## Sources Consulted
- Local `ip route help` output from `iproute2-6.1.0`
- Local `man ip-route` and `man ip` on the review system
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-rule(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `ip(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip.8.html
- `traceroute(8)` Linux manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html

## Issues Found
- The `iif` example used `ip route get 8.8.8.8 iif eth1`, but the documented `get` syntax groups `from ADDRESS iif STRING`, and runtime verification showed `iif` alone returning `RTNETLINK answers: Invalid argument`. I updated the example to `ip route get 8.8.8.8 from 10.0.0.5 iif eth1` and clarified the description so it accurately represents an incoming-packet lookup.
- The `uid` explanation said "user ID making the lookup". I changed it to "user ID used for the lookup" to make the field description more precise.

## Review Notes
- The sample `cache` line in `ip route get` output is still plausible on current Linux systems, even though the old IPv4 route cache table itself was removed in Linux 3.6; `ip route show cached` is the part that no longer produces IPv4 cache entries.
- Exact output varies by host, interface names, source addresses, and policy-routing configuration.
