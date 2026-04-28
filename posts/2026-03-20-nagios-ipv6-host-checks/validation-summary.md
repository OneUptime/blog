# Validation Summary: How to Configure Nagios for IPv6 Host Checks

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nagios Core / Nagios XI
- monitoring-plugins (`check_ping`, `check_tcp`, `check_http`, `check_ssh`)
- IPv6 / ICMPv6
- systemd (for `systemctl reload nagios`)

## Sources Consulted
- monitoring-plugins official docs: https://www.monitoring-plugins.org/doc/man/
- monitoring-plugins source on GitHub (`plugins/check_ping.c`, `plugins/netutils.c`, `plugins/utils.h`) — verified `is_inet6_addr()` auto-detection in `check_ping.c` and the default `AF_UNSPEC` address family in `netutils.c`
- Nagios Core object configuration reference: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/objectdefinitions.html
- Nagios macro documentation for `$USER1$` and `$HOSTADDRESS$`: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/macrolist.html

## Issues Found
- Step 3 had a misleading comment: `# ICMP ping over IPv6 using check_ping -6 flag` introduced a `check_ping` command that did not actually pass `-6`. The command itself is correct because `check_ping` auto-detects IPv6 literals from `$HOSTADDRESS$` (via `is_inet6_addr()`), but the comment claimed otherwise. Updated the comment to: `# ICMP ping over IPv6 (check_ping auto-detects IPv6 literals in $HOSTADDRESS$)` so it matches the actual command behavior.

## Review Notes
- All four plugins used (`check_ping`, `check_tcp`, `check_http`, `check_ssh`) default to `AF_UNSPEC` and accept IPv6 literals without an explicit `-6` flag, so the manual test commands and the defined command lines work as written. The `-6` flag is only required to *force* IPv6 when resolving an ambiguous hostname.
- The plugin path `/usr/lib/nagios/plugins/` is correct for Debian/Ubuntu installs of `monitoring-plugins`. RHEL/CentOS/Alma typically install plugins under `/usr/lib64/nagios/plugins/` — readers on those distros should adjust accordingly.
- `check_http -I 2001:db8::10` works because the address is passed straight to `getaddrinfo`; brackets are not needed with `-I` (they would be needed inside a URL).
- The post mixes IPv6 example addresses from the documentation range `2001:db8::/32` (RFC 3849), which is the correct choice for documentation.
