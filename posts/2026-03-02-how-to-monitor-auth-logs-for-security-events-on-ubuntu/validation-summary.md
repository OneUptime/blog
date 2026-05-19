# Validation Summary: How to Monitor Auth Logs for Security Events on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (auth.log)
- rsyslog
- sshd (OpenSSH)
- sudo logging
- PAM (pam_unix)
- bash scripting (tail, grep, awk, sed, cut)
- systemd / journalctl
- systemd unit files
- fail2ban
- cron

## Sources Consulted
- OpenSSH sshd log message format (sshd source: auth-passwd.c, auth.c message strings)
- sudo manpage and log format (sudo.conf(5), sudoers(5))
- rsyslog property-based filter syntax and forwarding (`@@` for TCP, `@` for UDP)
- fail2ban manual and jail.conf reference (https://github.com/fail2ban/fail2ban/wiki, jail.conf documentation)
- fail2ban-client command reference, including `get <jail> banip` (available in fail2ban 0.11+)
- systemd `journalctl(1)` man page — verified `-u` (unit), `-t` (SYSLOG_IDENTIFIER), `-b`, and `--since` flags
- Ubuntu openssh-server package: systemd unit name is `ssh.service` (not `sshd.service`)
- bash associative array syntax (`declare -A`)
- crontab(5) format

## Issues Found
1. **`journalctl -u sshd -b`** — On Ubuntu the OpenSSH systemd unit is `ssh.service`, not `sshd.service`. Using `-u sshd` filters by `_SYSTEMD_UNIT=sshd.service` and would return no results on Ubuntu. Changed to `journalctl -u ssh -b`.
2. **`journalctl -u sshd --since "1 hour ago"`** — Same issue as above. Changed to `journalctl -u ssh --since "1 hour ago"`.
3. **`journalctl -u sudo -b`** — sudo is not a long-running systemd service; there is no `sudo.service` unit, so this command returns nothing. Changed to `journalctl -t sudo -b`, which filters by SYSLOG_IDENTIFIER (sudo writes journal entries with that identifier).

## Review Notes
- The awk field positions are correct against current OpenSSH sshd log messages:
  - `Failed password for <user> from <ip> port <port> ssh2` → `$9` = user, `$11` = IP ✓
  - `Accepted <method> for <user> from <ip> port <port> ssh2` → `$7` = method, `$9` = user, `$11` = IP ✓
  - `Invalid user <user> from <ip> port <port>` → `$8` = user, `$10` = IP ✓
- The sudo log line uses spaces around the `:` and `;` separators, so the documented awk/sed pipeline (`$6` = invoking user, `$14` = `COMMAND=...`) is correct for the standard sudoers log format.
- `fail2ban-client get sshd banip` is a valid command (added in fail2ban 0.11) that returns the currently banned IPs for the jail — verified, left as-is.
- The `[sshd-ddos]` filter still ships in fail2ban filter.d, though its functionality has largely been merged into the standard `sshd` filter with `mode = aggressive` in fail2ban 0.10+. The configuration shown will work but is somewhat redundant on modern fail2ban versions. Not changed as it is still functional.
- Worth noting (but not strictly an error): on Ubuntu 24.04+, `rsyslog` is no longer installed by default, so `/var/log/auth.log` will not exist out-of-the-box. The user would need to `apt install rsyslog` for the file-based commands to work; otherwise they should rely on the journalctl section. The post implicitly addresses this by including a journalctl section as an alternative.
- The `date -d yesterday '+%b %e'` formatting correctly matches the auth.log timestamp prefix (e.g., `Mar  2` with two spaces for single-digit days, which `%e` produces).
- The associative array tracking in the alerting script will reset on script restart, which is acceptable for the demo but worth flagging for production use.
