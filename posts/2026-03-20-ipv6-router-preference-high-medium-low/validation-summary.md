# Validation Summary: How to Configure IPv6 Router Preference (High, Medium, Low)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Router Advertisements
- RFC 4191 default router preference
- `radvd`
- Linux `iproute2`
- Cisco IOS IPv6 Neighbor Discovery
- Juniper Junos router advertisement configuration

## Sources Consulted
- RFC 4191, "Default Router Preferences and More-Specific Routes": https://datatracker.ietf.org/doc/html/rfc4191
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `radvd.conf(5)` Debian manpage: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- `radvd(8)` Debian manpage: https://manpages.debian.org/bookworm/radvd/radvd.8.en.html
- Cisco IOS "IPv6 Default Router Preference": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_basic/configuration/15-s/ip6b-15-s-book/ip6-def-router-pref.html
- Juniper Junos `preference` statement for IPv6 Router Advertisement: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/preference-edit-protocols-router-advertisemt.html
- Local CLI help checked in the review environment: `ping -h`, `ping6 -h`, and `pkill --help`

## Issues Found
- The Junos configuration used `default-preference`, but current Junos documentation uses the `preference` statement under `protocols router-advertisement interface`. I changed both Junos examples to `preference high` and `preference low`.
- The Linux verification note incorrectly implied that RFC 4191 preference is the same thing as route metric. I changed the note to describe the `pref` field accurately instead of conflating it with metric selection.
- The failover script used `2001:db8:isp::1`, which is not a valid IPv6 address. I replaced it with the valid documentation address `2001:db8:100::1`.
- The failover script used `ping6`; I updated it to `ping -6`, which matches current `ping(8)` usage.
- The failover script hardcoded `/var/run/radvd/radvd.pid`, which is distribution-specific and does not match the default `radvd` pidfile documented in current Debian manpages. I replaced it with `pkill -HUP radvd` to avoid the incorrect path assumption.

## Review Notes
- Junos documents the IPv6 Router Advertisement `preference` statement as introduced in Junos OS 16.1, so platform/version support should be checked on older releases.
- Linux documents the default metric for RA-learned default routes as `1024` via `ra_defrtr_metric`; the sample `metric 100` output in the post is illustrative rather than a universal default.
