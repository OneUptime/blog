# Validation Summary: How to Configure Fail2Ban Log Parsing for IPv4 Ban Triggers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fail2Ban
- Linux
- `iptables`
- `fail2ban-client`
- `fail2ban-regex`
- Nginx
- SSH

## Sources Consulted
- Fail2Ban filter development docs: https://fail2ban.readthedocs.io/en/latest/filters.html
- Fail2Ban upstream `jail.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/jail.conf
- Fail2Ban upstream `common.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/filter.d/common.conf
- Fail2Ban upstream `iptables.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/action.d/iptables.conf
- Fail2Ban upstream `iptables-multiport.conf`: https://raw.githubusercontent.com/fail2ban/fail2ban/master/config/action.d/iptables-multiport.conf
- Fail2Ban `jail.conf(5)` man page: https://raw.githubusercontent.com/fail2ban/fail2ban/master/man/jail.conf.5
- Fail2Ban `fail2ban-client(1)` man page: https://raw.githubusercontent.com/fail2ban/fail2ban/master/man/fail2ban-client.1
- Fail2Ban `fail2ban-regex(1)` man page: https://raw.githubusercontent.com/fail2ban/fail2ban/master/man/fail2ban-regex.1
- Fail2Ban upstream `ticket.py` ban-time handling: https://raw.githubusercontent.com/fail2ban/fail2ban/master/fail2ban/server/ticket.py

## Issues Found
- The custom filter used `%(_prefix_line)s`, but upstream `common.conf` defines `__prefix_line`. I changed the sample to `%(__prefix_line)s` so the filter syntax matches current Fail2Ban interpolation rules.
- The post described `<HOST>` as an IPv4 placeholder, which is inaccurate. Upstream `jail.conf(5)` documents `<HOST>` as matching IP addresses and hostnames, while `<IP4>` is the IPv4-only tag. I changed the custom filter and conclusion to use `<IP4>`.
- The custom filter mixed syslog-style patterns with an access-log-only `logpath`, so part of the sample would not have matched the monitored files. I updated the custom jail to watch both `/var/log/myapp/app.log` and `/var/log/myapp/access.log`.
- The access-log regexes were tightened to anchor correctly while still allowing trailing access-log fields after the HTTP status code, which keeps them compatible with common log formats.
- The jail examples hard-coded `/var/log/auth.log` and `/var/log/nginx/error.log`. Upstream `jail.conf` uses path variables such as `%(sshd_log)s` and `%(nginx_error_log)s` for distro portability, so I changed the snippets to use those variables.
- The custom action used `iptables-multiport`, whose upstream action file is marked obsolete and superseded by `iptables[type=multiport]`. I updated the action syntax accordingly.
- The introduction said Fail2Ban typically inserts an `iptables` `DROP` rule. Upstream `iptables.conf` defaults `blocktype` to `REJECT --reject-with icmp-port-unreachable`, so I changed the wording to the more accurate generic `iptables` rule.

## Review Notes
- `bantime = -1` is still valid for permanent bans; upstream source handles `-1` as a non-expiring ban time.
- `usedns = warn`, `fail2ban-client reload`, `fail2ban-client set <JAIL> banip|unbanip`, and `fail2ban-regex -v` all match current upstream documentation.
- I did not run a live Fail2Ban daemon in this environment; validation was done against current upstream documentation and source.
