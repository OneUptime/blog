# Validation Summary: How to View the IPv6 Routing Table on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux
- IPv6
- `iproute2` (`ip`)
- `net-tools` (`netstat`, `route`)

## Sources Consulted
- `ip-route(8)` man page: https://manpages.debian.org/trixie/iproute2/ip-route.8.en.html
- `ip(8)` man page: https://manpages.debian.org/trixie/iproute2/ip.8.en.html
- `ip-monitor(8)` man page: https://manpages.debian.org/testing/iproute2/ip-monitor.8.en.html
- `netstat(8)` man page: https://net-tools.sourceforge.io/man/netstat.8.html
- `route(8)` man page: https://manpages.debian.org/trixie/net-tools/route.8.en.html
- RFC 3849 (IPv6 documentation prefix): https://www.rfc-editor.org/info/rfc3849
- Local command help and direct command validation on Linux: `ip -6 route help`, `ip -6 monitor help`, `netstat --help`, `route --help`, `ip -6 route show`, `ip -d -6 route show`, `netstat -6rn`, and `route -6 -n`

## Issues Found
- `ip -6 route show detail` was invalid syntax. It was changed to `ip -d -6 route show` because `-d`/`--details` is a global `ip` option, not a `route show` selector.
- The main-table sample output for `ip -6 route show` incorrectly included `::1`, which is normally shown from the kernel-managed `local` table rather than the default main table. That line was removed, and the `table local` description was clarified.
- `ip -6 route show cache` was described as showing routes "including cache entries". The wording was corrected to "cached IPv6 route entries, if any" because the command shows cache entries only and may legitimately print nothing.
- The `netstat -6rn` sample output headings and flags did not match current `net-tools` IPv6 route output. The sample was updated to reflect the actual column labels and a realistic IPv6 route listing.
- The `ip -6 monitor route` example claimed the output used `+` and `-`, and it showed a `[ROUTE]` prefix without enabling labels. The example was corrected to match normal monitor output for added and deleted routes.
- The `table 100` example was clarified to note that it applies when a custom policy-routing table is configured, because querying a nonexistent table can return an error.
- The overview and summary were tightened to note that `netstat` and `route` are legacy `net-tools` commands that may not be present unless that package is installed.

## Review Notes
- The post is technically relevant and salvageable; only targeted accuracy fixes were needed.
- `netstat` and `route` remain valid legacy commands when `net-tools` is installed, but current Linux documentation treats `iproute2` as the modern interface.
- The examples use `2001:db8::/32`, which is the reserved IPv6 documentation prefix defined by RFC 3849.
