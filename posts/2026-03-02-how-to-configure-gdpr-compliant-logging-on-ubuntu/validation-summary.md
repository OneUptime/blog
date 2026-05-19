# Validation Summary: How to Configure GDPR-Compliant Logging on Ubuntu

## Status
validated

## Post Type
Tutorial / compliance configuration guide

## Technologies Covered
- Ubuntu
- systemd-journald and journalctl
- rsyslog
- Nginx access logging
- Apache HTTP Server access logging
- Python logging
- sed, grep, zgrep, awk, find, stat
- logrotate
- Linux audit / auditctl
- GDPR logging principles

## Sources Consulted
- systemd `journald.conf(5)` manual: https://man7.org/linux/man-pages/man5/journald.conf.5.html
- rsyslog configuration, templates, filters, and actions: https://docs.rsyslog.com/doc/configuration/
- rsyslog common configuration mistakes: https://new.rsyslog.com/doc/faq/common-config-mistakes.html
- Nginx `ngx_http_map_module` documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx `ngx_http_geo_module` documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Apache HTTP Server 2.4 log files documentation: https://httpd.apache.org/docs/current/logs.html
- Python `logging` module documentation: https://docs.python.org/3/library/logging.html
- `logrotate(8)` manual: https://man7.org/linux/man-pages/man8/logrotate.8.html
- `auditctl(8)` manual: https://man.archlinux.org/man/auditctl.8.en
- EUR-Lex GDPR Regulation (EU) 2016/679: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
- CJEU press release for Case C-582/14 on dynamic IP addresses: https://curia.europa.eu/site/upload/docs/application/pdf/2016-10/cp160112en.pdf

## Issues Found
- The rsyslog section claimed to anonymize data, but the snippet only changed the output template and could duplicate auth logs through later default rules. Updated the wording, removed duplicate module loading, used a reduced auth template with a modern `action(...)`, and added `stop` inside an rsyslog conditional block.
- The Nginx snippet included an unused IPv6 `geo` variable and logged authenticated usernames through `$remote_user`. Removed the unused variable, made the IPv4 anonymization regex stricter, and replaced the logged username field with a literal placeholder.
- The Apache snippet referenced an undefined `GDPR_IP` environment variable and still included authenticated usernames. Replaced it with a minimal `LogFormat` that drops both client IP and authenticated username.
- The Python `logging.Filter` modified `record.msg` but left `record.args` intact, which could reintroduce sensitive values or break formatting after filtering. Updated it to sanitize `record.getMessage()` and clear `record.args`.
- The access-control commands created a dedicated `log-readers` group but left the log file owned by the `adm` group. Reordered and corrected the commands so the file and directory are owned by `root:log-readers`, and made group creation idempotent.
- The data request script searched and deleted IP addresses as regular expressions. Updated it to use fixed-string `grep`/`zgrep` for searches and literal-string `awk` filtering for deletion.
- The data request script stored `find` output in a scalar variable, which could split paths incorrectly. Changed it to stream `find` results through a `while read` loop with grouping and `-type f` so only matching files are processed safely.

## Review Notes
The post is technically valid after correction, but it should still be treated as operational guidance rather than a legal compliance guarantee. Retention periods, legal basis, and erasure handling need organization-specific legal review, and the Nginx example intentionally anonymizes IPv4 only while replacing other address formats with a placeholder.
