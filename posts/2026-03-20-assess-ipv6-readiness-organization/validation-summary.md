# Validation Summary: How to Assess IPv6 Readiness for Your Organization

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux networking tools (`ip`, `ping`, `curl`, `dig`, `grep`)
- Cisco IOS / IOS XE IPv6 operations
- Prometheus HTTP API
- Nagios/Icinga Monitoring Plugins
- Zabbix
- Python (`subprocess`)

## Sources Consulted
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/rfc6177/
- `ping(8)` from iputils: https://man7.org/linux/man-pages/man8/ping.8.html
- `ip-address(8)` and `ip-route(8)` from iproute2: https://man7.org/linux/man-pages/man8/ip-address.8.html and https://man7.org/linux/man-pages/man8/ip-route.8.html
- curl man page and tutorial: https://curl.se/docs/manpage.html and https://curl.se/docs/tutorial.html
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.20.22/manpages.html
- Cisco IOS XE IPv6 documentation: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/configuration/guide/ipv6-xe-16-book-cat8000/m_ip6-addrg-bsc-con.html and https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s4.html
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Monitoring Plugins `check_ping`: https://www.monitoring-plugins.org/doc/man/check_ping.html
- Zabbix `zabbix_get` manual: https://www.zabbix.com/documentation/current/en/manpages/zabbix_get
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Local command help in the review environment: `curl --help all`, `ping -h`, `dig -h`

## Issues Found
- The Internet Connectivity example said `ip -6 route show default` checked prefix assignment, but that command only shows the default route. I added `ip -6 address show scope global` and rewrote the description so the commands match what they actually verify.
- The connectivity table used `/56 or larger prefix delegated` as a universal pass criterion. I replaced it with a plan-appropriate global address/prefix requirement because RFC 6177 explicitly rejects a one-size-fits-all end-site prefix size.
- The DMZ reachability example used `ping6`. I changed it to `ping -6`, which is the current iputils interface and the documented replacement for the old standalone `ping6` binary.
- The DNS row said it checked for "IPv6 DNS resolvers available" while the command only validated AAAA lookups. I renamed the check to `AAAA DNS resolution works` so the label matches the command.
- The Prometheus example used an IPv6 literal in a URL without curl's `-g`/`--globoff` flag. I added `-g` so the command works as shown.
- The Nagios/Icinga example used `check_ping6`, but the official Monitoring Plugins documentation exposes IPv6 via `check_ping ... -6`. I updated the command accordingly.
- The conclusion said the assessment covered five dimensions even though the post scores six categories. I corrected it to six and changed "most common" to "common" to avoid overstating environment-specific blocker rankings.

## Review Notes
- The `zabbix_get` example is valid for IPv6-capable agents; Zabbix documents IPv6 support, but whether `::1` works depends on the agent being built/configured with IPv6 enabled on the target system.
- The Python scanner is syntactically valid. Its `grep` pattern intentionally finds potential IPv4 literals and may include false positives such as non-routable or invalid dotted quads, which is acceptable for a quick audit heuristic.
- The `api6.ipify.org` check is intentionally IPv6-only, so failure on IPv4-only networks is expected and consistent with the endpoint design.
