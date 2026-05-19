# Validation Summary: How to Monitor WAF Logs and Block Attacks on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ModSecurity (WAF, v2.x and v3.x)
- Apache HTTP Server on Ubuntu
- OWASP Core Rule Set (CRS)
- fail2ban (jail and filter configuration)
- iptables-multiport action
- jq (JSON parsing)
- awk / grep / sed shell tooling
- cron + mailutils for alerting
- mlogc (ModSecurity log collector)
- Prometheus / Grafana / ELK (mentioned as monitoring backends)

## Sources Consulted
- ModSecurity Reference Manual v2.x: https://github.com/SpiderLabs/ModSecurity/wiki/Reference-Manual-(v2.x)
- ModSecurity 2 Data Formats: https://github.com/SpiderLabs/ModSecurity/wiki/ModSecurity-2-Data-Formats
- ModSecurity Handbook (Logging): https://www.feistyduck.com/library/modsecurity-handbook-free/online/ch04-logging.html
- Ubuntu package contents (libapache2-mod-security2, modsecurity-crs): https://packages.ubuntu.com
- OWASP CRS rule files (REQUEST-941, REQUEST-942, REQUEST-913): https://github.com/coreruleset/coreruleset
- fail2ban filter common.conf (`_apache_error_client` macro)

## Issues Found

1. **Audit log boundary format was wrong.** The post showed boundary markers as `---UNIQUE_ID---A--` (three dashes prefix, three dashes between ID and section letter). The actual ModSecurity native audit log format is `--UNIQUE_ID-A--` (two dashes prefix, single dash between ID and letter, two dashes suffix). Updated all seven section labels (A, B, C, F, G, H, Z) and the two awk patterns that referenced the boundary regex.

2. **`SecAuditLogDir` is not a real ModSecurity directive.** The commented-out config snippet referenced `SecAuditLogDir`; the correct directive for the concurrent-log destination is `SecAuditLogStorageDir`. Fixed the comment.

3. **awk patterns matching the boundary lines were broken.** The patterns `/^---/`, `/---.*---A--/`, `/---H--/`, `/---[A-Z]--/`, and `/---.*---A--/` would never match real audit log lines (which start with two dashes). Rewrote them to anchor on `^--.*-X--$`.

4. **IP extraction from section A used the wrong awk field index.** The A-section payload is `[timestamp] +tz] unique_id source_ip source_port dest_ip dest_port`. Because the timestamp contains a space (between date and timezone), splitting by space puts the source IP at field 4, not field 3 (which holds the unique transaction ID). Changed `a[3]` to `a[4]` in the `waf_summary.sh` script.

5. **mlogc package on Ubuntu was wrong.** The post advised `sudo apt install modsecurity-crs` to install mlogc. The `modsecurity-crs` package contains only the OWASP Core Rule Set (rule files in `/usr/share/modsecurity-crs/`). The `/usr/bin/mlogc` binary actually ships with `libapache2-mod-security2`. Updated the install command and comment.

## Review Notes

- The comment "Enable JSON audit log format (ModSecurity 3.x)" is slightly imprecise — `SecAuditLogFormat JSON` can also work in ModSecurity 2.9+ when built with the YAJL library, but it is most reliably available in libmodsecurity v3. Left as-is since the post's framing isn't strictly wrong and the practical guidance (v3 = JSON works out of the box) holds.
- The fail2ban `_apache_error_client` macro is the standard single-underscore name in `/etc/fail2ban/filter.d/apache-common.conf`. Verified.
- OWASP CRS rule ranges referenced in the post (941 = XSS, 942 = SQLi, 913 = scanner) match the current CRS v3 layout.
- The cron-installation snippet (`echo ... | sudo tee /etc/cron.d/waf-alert`) correctly includes the user field that `/etc/cron.d/` entries require — this is a common pitfall the author got right.
- `tail -F` (capital F) is correct for log files that may rotate; verified appropriate vs. `tail -f`.
- The "Real-Time Attack Detection Script" claims to alert on the `ALERT_THRESHOLD` but never actually implements counting/alerting — the body just prints each event. The inline comment acknowledges this ("In production, use a proper counter with Redis or similar"), so it's an intentional simplification rather than a technical error.
