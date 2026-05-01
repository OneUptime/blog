# Validation Summary: How to Display the Routing Table with ip route show on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux
- iproute2
- IPv4 routing
- `ip` command
- Network diagnostics

## Sources Consulted
- `ip-route(8)` manual page from the iproute2 project: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip(8)` manual page from the iproute2 project: https://man7.org/linux/man-pages/man8/ip.8.html
- `ip-rule(8)` manual page for the built-in `local`, `main`, and `default` tables: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Local command help output from `ip route help`
- Local command help output from `ip -help`

## Issues Found
- The post used `ip route show verbose`, but `verbose` is not a valid `ip route show` argument. I changed it to `ip -details route show`, which is the supported way to request more detailed output.
- The comment above `ip route show 10.0.0.0/8` described filtering by destination, but `ip route show` with a bare prefix performs exact prefix selection. I changed the wording to say `specific prefix` so it matches the command's actual behavior.

## Review Notes
- `ip route get` output can vary slightly by kernel and iproute2 version and may include additional lines such as `cache`.
- `ip route show table all` can include IPv6 routes on dual-stack systems. The separate `ip -4 route show` example in the post is the correct way to restrict output to IPv4.
