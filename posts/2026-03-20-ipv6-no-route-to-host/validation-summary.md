# Validation Summary: How to Troubleshoot IPv6 No Route to Host

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 routing on Linux
- `iproute2` (`ip -6 route`)
- ICMPv6 Router Advertisements and Router Solicitations
- `ndisc6` / `rdisc6`
- `iputils` `ping`
- `systemd-networkd`
- Linux IPv6 sysctls

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/next/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- systemd.network official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Upstream `rdisc6(8)` man page from ndisc6: https://raw.githubusercontent.com/nomis/ndisc6/master/doc/rdisc6.8
- `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local `ping(8)` man page from iputils, verified in the review environment

## Issues Found
- The command `rdisc6 -m 3 -w 5000 eth0` used the wrong flag. In `rdisc6`, `-m` means "multiple advertisements", while retry count uses `-r`. I changed it to `rdisc6 -r 3 -w 5000 eth0` so the command behaves as described.
- The diagnostic script used `ping6`. Current iputils documents IPv6 pings via `ping -6`, and `ping6` is only a compatibility symlink on systems that provide it. I changed the script to use `ping -6` for the gateway and internet reachability checks.

## Review Notes
- The explanations about RA-learned default routes, `accept_ra=2` when forwarding is enabled, and the `systemd-networkd` `[Route]` syntax are technically consistent with the consulted sources.
- `ip -6 route show cache` is syntactically valid, but on many systems it may provide little useful troubleshooting data compared with `ip -6 route show` and `ip -6 route get`.
