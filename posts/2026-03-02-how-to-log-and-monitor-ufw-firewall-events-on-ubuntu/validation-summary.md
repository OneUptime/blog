# Validation Summary: How to Log and Monitor UFW Firewall Events on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- Ubuntu (20.04 / 22.04 / 24.04)
- rsyslog
- journald / journalctl
- logrotate
- fail2ban
- Bash scripting (grep, awk, sort, cron)
- Python 3 (re, collections.defaultdict)

## Sources Consulted
- ufw(8) man page (Ubuntu Noble 24.04): https://manpages.ubuntu.com/manpages/noble/man8/ufw.8.html
- ufw(8) man page (Ubuntu Jammy 22.04): https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu UFW package `/etc/default/ufw` and `/etc/logrotate.d/ufw` defaults
- Default `/etc/rsyslog.d/20-ufw.conf` shipped with Ubuntu
- fail2ban `action.d/ufw.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/action.d/ufw.conf
- rsyslog configuration documentation (legacy property-based filters and `stop` directive): https://www.rsyslog.com/doc/configuration/converting_to_new_format.html

## Issues Found
1. **"UFW logging is off by default" was incorrect.** Per the ufw(8) man page, UFW defaults to log level `low` when enabled, and `/etc/default/ufw` ships with `LOGLEVEL=low`. Reworded the section intro to clarify that logging is on at `low` by default once UFW is enabled, and that `ufw logging on` confirms or restores it.

2. **Log level descriptions were oversimplified and partly inaccurate.** The original wording said `low` "logs only blocked packets", `medium` "adds all allowed packets that aren't matching application profiles", `high` "adds rate-limited packets", and `full` "logs everything including application profile matches". UFW's actual definitions (per the man page) are about default-policy matches, INVALID packets, new connections, and rate limiting - not "application profiles". Replaced the inline comments with descriptions that match the man page semantics while keeping the author's compact comment style.

3. **"UFW log entries appear in two places" but four were listed**, and the post implied `/var/log/ufw.log` is always present on Ubuntu 20.04+. Clarified that UFW emits kernel messages routed by the logging stack, that `/var/log/ufw.log` depends on rsyslog being installed (which is no longer guaranteed on Ubuntu 24.04 minimal/cloud images), and that journald is always available.

## Review Notes
- The standard Ubuntu UFW logrotate `postrotate` action uses `invoke-rc.d rsyslog rotate`, which is what ships in the package and still works on systemd-based Ubuntu via the init.d shim. The more modern equivalent is `/usr/lib/rsyslog/rsyslog-rotate`. Left as written since it matches the packaged config.
- The fail2ban filter regex `\[UFW BLOCK\] .* SRC=<HOST> .*` is functionally correct; a slightly tighter community alternative is `\[UFW BLOCK\].+SRC=<HOST> DST`. Not changed.
- The Python script imports `sys` and `datetime` but never uses them. Minor and not technically wrong; left as is to respect the "fix only technical errors" rule.
- `parse_ufw_line` will not classify lines tagged `[UFW LIMIT BLOCK]` because the initial guard only checks for the literal substrings `UFW BLOCK` and `UFW ALLOW`. If the user wants LIMIT events in the report, they would need to also check for `UFW LIMIT BLOCK`. This is a behavioral nuance rather than a syntax error, so it was not modified.
- Log file paths, command flags (`grep -oP`, `date -d`, `journalctl -f -k`), rsyslog legacy filter syntax, and the fail2ban `action = ufw` setting are all verified accurate.
