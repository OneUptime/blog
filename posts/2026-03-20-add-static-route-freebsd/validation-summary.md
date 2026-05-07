# Validation Summary: How to Add a Static Route on FreeBSD

## Status
validated

## Post Type
Guide

## Technologies Covered
- FreeBSD
- IPv4 routing
- `route(8)`
- `netstat(1)`
- `rc.conf(5)`
- `service(8)` / rc.d routing

## Sources Consulted
- FreeBSD Handbook, Advanced Networking: https://docs.freebsd.org/en/books/handbook/advanced-networking/
- FreeBSD `route(8)` manual: https://man.freebsd.org/cgi/man.cgi?query=route&sektion=8&manpath=FreeBSD+15.0-STABLE
- FreeBSD `netstat(1)` manual: https://man.freebsd.org/cgi/man.cgi?query=netstat&sektion=1&manpath=FreeBSD+14.3-STABLE
- FreeBSD `rc.conf(5)` manual: https://man.freebsd.org/rc.conf
- FreeBSD source tree, `routing` rc script: https://cgit.freebsd.org/src/tree/libexec/rc/rc.d/routing?h=stable/14

## Issues Found
- The post used `netstat -rn -f inet -I em0` as if `-I` filtered routing-table output by interface. On FreeBSD, `-I` is for per-interface statistics, while routing-table display uses `-r`; the example was corrected to `netstat -rnW -f inet`, which is a valid route-table view and widens the interface-name column.
- The post mixed a section titled around `route show` with examples using `route get`. The examples were updated to `route show 192.168.2.100` so the commands match the current FreeBSD `route(8)` documentation and the section heading.

## Review Notes
- `/etc/rc.local` can still be used if present, but FreeBSD documentation prefers persistent routing through `/etc/rc.conf` or rc.d-style scripts. The post already presents `/etc/rc.conf` as the primary method, so no change was required there.
