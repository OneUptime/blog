# Validation Summary: How to Troubleshoot NTP over IPv6 Connectivity

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- NTP (Network Time Protocol)
- IPv6
- chrony / chronyc / chronyd
- ntpdate / ntpd
- ip6tables, firewalld
- tcpdump, nmap, nc, dig
- Linux `ip` command, systemd journalctl

## Sources Consulted
- [NTP Pool Project usage docs](https://www.ntppool.org/en/use.html) — confirmed that IPv6 is obtained via the `2.pool.ntp.org` zone (prefix "2"), not a non-existent `ipv6.pool.ntp.org`.
- [chrony 4.5 chronyc manual](https://chrony-project.org/doc/4.5/chronyc.html) — verified the `-h` option connects to a chronyd control endpoint (port 323), the `burst good/max` syntax, and the formatting of `chronyc sources` output.
- [chrony FAQ](https://chrony-project.org/faq.html)
- [ntp.org ntpdate documentation](http://www.ntp.org/documentation/4.1.2/ntpdate/) — confirmed `ntpdate -q` reports offsets in seconds (e.g., `offset 0.000123`), not milliseconds.
- Google Public DNS IPv6 address `2001:4860:4860::8888` — confirmed.

## Issues Found
1. **Incorrect NTP pool hostname**: Post recommended `ipv6.pool.ntp.org`, which is not an official zone of the NTP Pool project. Replaced with `2.pool.ntp.org` (the standard IPv6-capable pool zone that returns AAAA records).
2. **Misplaced chronyc connectivity test**: Under "Test NTP Port (UDP 123) Reachability", the post used `chronyc -h 2001:db8::1 sources`. The `-h` flag targets chronyd's control/cmdmon socket (default port 323) on the remote host, not NTP port 123, so it doesn't test NTP reachability and will fail unless the remote host runs chronyd with `cmdallow`. Removed this line.
3. **Incorrect IPv6 bracket claim**: The post instructed `chronyc sources -v | grep "\["` with a comment that IPv6 addresses are "shown in brackets". chronyc prints IPv6 addresses bare (e.g., `2001:db8::1`), not in `[...]` URI form. Changed the filter to `grep ":"` with an updated comment (IPv6 addresses contain colons).
4. **Wrong offset units in health-check script**: The script labeled the parsed ntpdate offset as `${offset}ms`, but `ntpdate -q` prints offsets in seconds. Changed the label to `${offset}s` so the reported value matches the actual unit.

## Review Notes
- The `ntpdate` utility is deprecated in newer NTP distributions and Linux distros (replaced by `ntpdig`, `chronyd` + `chronyc makestep`, or `systemd-timesyncd`). The commands still work where `ntpdate` is installed, but readers on modern systems may need to install it explicitly or substitute `ntpdig`/`chronyd -q`.
- The `ping6` binary has been deprecated in favor of `ping -6` on modern iputils; `ping6` remains available on most distros but may not be present on very recent minimal images.
- `/var/log/ntp/ntp.log` is a non-default path; most distros log via journald or `/var/log/syslog`. The path shown will only exist if configured in `ntp.conf`.
- `sudo journalctl -u ntp` may need to be `ntpd` or `ntp-server.service` depending on distribution; this variance is expected and not a strict error.
- Consider noting that NTS (Network Time Security, RFC 8915) is now the recommended way to authenticate chrony sources, but that is beyond the scope of a basic IPv6 connectivity troubleshooting guide.
