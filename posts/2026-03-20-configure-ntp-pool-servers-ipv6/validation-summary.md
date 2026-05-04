# Validation Summary: How to Configure NTP Pool Servers over IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- NTP Pool Project (pool.ntp.org)
- IPv6 / DNS AAAA records
- chrony / chronyd / chronyc
- ntpd (NTP reference implementation, ntp.conf)
- systemd-timesyncd
- glibc getaddrinfo / `/etc/gai.conf`
- `dig`, `ping6`, `tcpdump`, `ntpdate`

## Sources Consulted
- NTP Pool Project usage docs: https://www.ntppool.org/en/use.html
- Live DNS lookups against `pool.ntp.org`, `ipv6.pool.ntp.org`, `2.pool.ntp.org`, `2.<region>.pool.ntp.org`, and `ipv6.<region>.pool.ntp.org` to verify which zones actually resolve to AAAA records.
- ntp.org reference documentation for `restrict` (Access Control Options): https://www.ntp.org/documentation/4.2.8-series/accopt/
- chrony documentation for `pool` and `allow` directives (CIDR is supported in `allow`).
- glibc `gai.conf` defaults (RFC 3484 / RFC 6724 precedence table).

## Issues Found
1. **Non-existent IPv6 pool zones.** The post claimed an `ipv6.pool.ntp.org` zone and continental/country variants such as `ipv6.europe.pool.ntp.org`, `ipv6.us.pool.ntp.org`, `ipv6.de.pool.ntp.org`, `ipv6.jp.pool.ntp.org`, etc. Verified via `dig`: `ipv6.pool.ntp.org` returns no AAAA answer, and the regional/country `ipv6.<zone>.pool.ntp.org` names return NXDOMAIN. The NTP Pool Project's official docs state that IPv6 (AAAA) records are only returned for zones prefixed with `2.` (e.g., `2.pool.ntp.org`, `2.europe.pool.ntp.org`, `2.us.pool.ntp.org`). Replaced every `ipv6.…pool.ntp.org` reference throughout the post (zone listing, `dig`/`ping6` examples, chrony.conf, ntp.conf, systemd-timesyncd, "Joining the NTP Pool" section) with the correct `2.…pool.ntp.org` form, and rewrote the "NTP Pool IPv6 Zones" intro to explain the real `2.` prefix convention.
2. **Incorrect `restrict` syntax in ntp.conf.** The post used CIDR notation `restrict 2001:db8::/32 nomodify notrap nopeer`. ntpd's `restrict` directive does not parse CIDR notation; it requires `address [mask <mask>]`. Changed to `restrict 2001:db8:: mask ffff:ffff:: nomodify notrap nopeer` and added a brief inline note.
3. **Misleading gai.conf comment.** The line `echo "precedence ::ffff:0:0/96 5"` is correct for preferring native IPv6 (it lowers IPv4-mapped precedence below the default of 10), but the inline comment said "This setting prioritizes IPv4 for IPv4-mapped addresses", which is the opposite of what it does. Rewrote the comment to accurately describe the effect (deprioritizes IPv4-mapped addresses so native IPv6 wins).

## Review Notes
- The example IPv6 prefix `2001:db8::/32` is RFC 3849's reserved documentation prefix — appropriate for examples.
- `ping6` still ships on most distros but has been deprecated in newer iputils in favor of unified `ping`. Left as-is since both still work and the post's audience may be on older systems.
- `ntpdate` has been deprecated upstream in favor of `sntp`, but it is still widely available. Left as-is.
- The chrony `allow` directive does support CIDR notation for both IPv4 and IPv6, so `allow 2001:db8::/32` is correct.
- Whether a given `2.<zone>.pool.ntp.org` returns AAAA depends on the zone having IPv6-capable members; this is now noted in the rewritten zone-list section.
