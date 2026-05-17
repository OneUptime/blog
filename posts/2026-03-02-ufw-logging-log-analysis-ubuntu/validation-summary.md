# Validation Summary: How to Set Up UFW Logging and Log Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- Ubuntu
- iptables / netfilter
- rsyslog
- logrotate
- fail2ban
- grep / awk / Perl-compatible regex
- cron

## Sources Consulted
- UFW manpage (`man ufw`) and Ubuntu UFW documentation: https://help.ubuntu.com/community/UFW
- UFW upstream README and source code (logging prefixes: `[UFW BLOCK]`, `[UFW ALLOW]`, `[UFW LIMIT BLOCK]`, `[UFW AUDIT]`)
- iptables/netfilter LOG target documentation (field names: SRC, DST, PROTO, SPT, DPT, etc.)
- PCRE documentation on `\K` semantics (resets reported match start)
- rsyslog documentation: https://www.rsyslog.com/doc/ (property-based filters, forwarding syntax with `@` and `@@`)
- fail2ban documentation: https://github.com/fail2ban/fail2ban (jail.local conventions, `banaction = ufw`, sshd jail defaults)
- Ubuntu rsyslog package (`/usr/lib/rsyslog/rsyslog-rotate` is the current standard postrotate script)
- logrotate(8) manpage

## Issues Found

1. **Broken regex in "Find Port Scan Activity"** (was: `grep -oP 'SRC=\K[0-9.]+ .*?DPT=\K[0-9]+'`). Verified empirically with `echo "SRC=1.2.3.4 ... DPT=22" | grep -oP '...'` that PCRE's second `\K` resets the reported match start again, so only the port (`22`) was output — never the source IP. The subsequent `awk '{print $1}' | sort | uniq -c | sort -rn` was therefore counting ports, duplicating the previous "Most Targeted Ports" query rather than finding IPs that hit many ports. Replaced with an awk-based extractor that emits `SRC DPT` pairs, then `sort -u` to dedupe (so an IP hammering the same port many times isn't double-counted), then counts unique source IPs.

2. **Broken regex in "With protocol information"** (was: `grep -oP 'PROTO=\K[A-Z]+.*?DPT=\K[0-9]+'`). Same double-`\K` bug — the command output only the port number, not "protocol port" pairs as the comment promised. Replaced with an awk-based extractor that prints `PROTO DPT` correctly.

3. **Outdated logrotate `postrotate` script**. The post used `invoke-rc.d rsyslog rotate > /dev/null`. The current Ubuntu rsyslog package ships `/usr/lib/rsyslog/rsyslog-rotate`, which is what the default `/etc/logrotate.d/ufw` actually uses on modern Ubuntu releases (22.04 / 24.04). Updated the example accordingly, and added `sharedscripts` to match the default config style.

## Review Notes

- The descriptions of UFW logging levels (`low`/`medium`/`high`/`full`) are simplifications. The official distinction between `high` and `full` is really about rate limiting (`high` = verbose with rate limiting, `full` = verbose without rate limiting), not "new vs established". The post's simplification is acceptable for a practical guide since the operational guidance ("be careful with `high` and `full` — they generate enormous log volumes") is correct. Left as-is.
- The `awk '{print $1, $2, substr($3,1,2)":00"}'` for hourly buckets correctly handles both single- and double-digit days because awk's default field splitting collapses runs of whitespace. Note: the subsequent alphabetical `sort` won't give true chronological order across month boundaries (e.g., "Apr" sorts before "Mar"), but within a single rotation window this is fine.
- `kern.*` forwarding will forward *all* kernel messages, not just UFW — this is acknowledged by the inline comment in the post.
- On Ubuntu 22.04+, sshd logs go to the systemd journal by default; fail2ban's `[sshd]` jail uses `backend = %(sshd_backend)s` which resolves to `systemd` via auto-detection, so `logpath = %(sshd_log)s` continues to work without manual changes. No fix needed.
- The `[UFW AUDIT]` prefix mentioned in the log-entry section is correct; UFW also emits `[UFW LIMIT BLOCK]` (for rate-limited rules) and `[UFW AUDIT INVALID]`, but the post doesn't claim to be exhaustive.
