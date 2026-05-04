# Validation Summary: How to Configure NTP Server for IPv6 Clients

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- NTP (Network Time Protocol)
- ntpd (classic NTP daemon, ntp.conf)
- chrony / chronyd / chronyc
- IPv6 networking
- ip6tables / netfilter-persistent
- firewalld
- ntpdate, ntpq
- nmap (IPv6 UDP scan)
- systemd service management
- Bash scripting

## Sources Consulted
- ntp.org 4.2.8 access control documentation: https://www.ntp.org/documentation/4.2.8-series/access/
- NTPsec ntp.conf documentation: https://docs.ntpsec.org/latest/ntp_conf.html
- chrony.conf 4.5 documentation: https://chrony-project.org/doc/4.5/chrony.conf.html
- ntpdate documentation: https://www.ntp.org/documentation/4.2.8-series/ntpdate/
- iptables-persistent / netfilter-persistent (Debian/Ubuntu) standard paths
- ip6tables(8) man page

## Issues Found
1. **ntpd `restrict` CIDR syntax** — The original used `restrict 2001:db8::/32 nomodify notrap nopeer`. CIDR notation is supported by NTPsec but NOT by classic ntpd, where the documented syntax requires the `mask` keyword. Changed to `restrict 2001:db8:: mask ffff:ffff:: nomodify notrap nopeer` for broader compatibility with both classic ntpd and NTPsec.
2. **Wrong ip6tables save path** — The original wrote `sudo ip6tables-save > /etc/ip6tables/rules.v6`. The standard path used by `iptables-persistent` / `netfilter-persistent` on Debian/Ubuntu is `/etc/iptables/rules.v6` (single `iptables` directory holds both `rules.v4` and `rules.v6`). Fixed to `/etc/iptables/rules.v6`.
3. **Incorrect offset unit in monitoring script** — `ntpdate -q` reports offset in seconds (with the `sec` suffix in its output), not milliseconds. The script labelled the captured value as `${offset}ms`. Changed the label to `${offset}s` to match the actual unit ntpdate emits.

## Review Notes
- The post mixes classic ntpd and chrony examples; both daemons are still in active use in different distributions. The tutorial does not mention which OS/version it targets — readers using RHEL/CentOS may need to substitute service names (e.g., `ntpd` instead of `ntp` for systemctl).
- `ntpdate` is deprecated in many recent distributions (replaced by `chronyd -q` or `sntp`). The post still uses it for testing and monitoring, which works but may not be available on minimal modern installs.
- `ntpq` reports offset in milliseconds, while `ntpdate` reports it in seconds — a frequent source of confusion. The corrected monitoring script reflects ntpdate's seconds output.
- The example IPv6 documentation prefix `2001:db8::/32` is appropriate per RFC 3849 for documentation purposes.
- Listing both `pool 2.pool.ntp.org` and `server time.google.com` is fine; both have IPv6 records and `iburst` is valid for both directives.
