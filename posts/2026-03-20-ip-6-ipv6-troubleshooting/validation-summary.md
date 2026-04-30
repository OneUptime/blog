# Validation Summary: How to Use ip -6 Commands for IPv6 Troubleshooting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `ip` / `iproute2`
- IPv6 addressing and routing
- IPv6 Neighbor Discovery
- Linux IPv6 sysctl configuration

## Sources Consulted
- `ip(8)` manual page: https://man7.org/linux/man-pages/man8/ip.8.html
- `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-neighbour(8)` manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `ip-monitor(8)` manual page: https://man7.org/linux/man-pages/man8/ip-monitor.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861

## Issues Found
- `ip -6 addr show detail` was not valid syntax. It was changed to `ip -6 -details addr show`, which matches the documented global `-details` option for `ip`.
- The "address flags" example used `mngtmpaddr` while describing `TEMPORARY`, `PERMANENT`, and `DEPRECATED`. It was replaced with `ip -6 addr show dev eth0 temporary` so the example now matches the behavior being described.
- The static route examples used `2001:db8:remote::/48`, which is not a valid IPv6 prefix because `remote` is not hexadecimal. It was corrected to `2001:db8:100::/48`.
- The route comments around `ip -6 route show`, `ip -6 route show cache`, and `ip -6 route show table all` were imprecise. They were updated to reflect that plain `ip -6 route show` shows the main table, `cache` shows cloned/cache-table routes if present, and `table all` shows routes from all routing tables.
- The interface-status examples claimed to show statistics without using the `-s` flag. They were corrected to `ip -6 -s link show` and `ip -6 -s link show dev eth0`.
- The diagnostic script heading said "IPv6 Statistics" even though `ip link` counters are interface-level rather than IPv6-only. The heading was corrected to "Interface Statistics".
- The `accept_ra` explanation was oversimplified. It now reflects current kernel behavior: `1` accepts RAs only when forwarding is disabled, and `2` accepts them even when forwarding is enabled.
- The `use_tempaddr` explanation was incomplete and potentially misleading. It now distinguishes value `1` from value `2` per the kernel documentation.

## Review Notes
- `ip -6 route show cache` is still documented, but on many systems it may print nothing because cache/cloned route entries are often absent.
- The neighbor-state descriptions are consistent with RFC 4861 for `REACHABLE`, `STALE`, `DELAY`, `PROBE`, and `FAILED`; the RFC also defines `INCOMPLETE`, which is not listed in the post.
- Examples were spot-checked against local `iproute2` behavior in addition to the upstream man pages.
