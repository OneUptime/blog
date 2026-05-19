# Validation Summary: How to Configure Login Attempt Limits on Ubuntu

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Ubuntu
- OpenSSH server configuration
- PAM and pam_faillock
- iptables recent match
- UFW
- fail2ban
- Linux authentication logs

## Sources Consulted
- Ubuntu sshd_config(5) manpage: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
- Ubuntu pam_faillock(8) manpage: https://manpages.ubuntu.com/manpages/focal/en/man8/pam_faillock.8.html
- Ubuntu faillock.conf(5) manpage: https://manpages.ubuntu.com/manpages/stonking/man5/faillock.conf.5.html
- Ubuntu ufw(8) manpage: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- iptables-extensions(8) local manpage for the recent match
- fail2ban jail.conf upstream configuration comments: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- Fail2Ban filter development documentation: https://fail2ban.readthedocs.io/en/latest/filters.html

## Issues Found
- The iptables `recent` example added the source IP to the recent list before checking the hit count. Because `--set` updates the current packet and always matches, the original order could drop the fourth new connection rather than allowing four per minute. I changed the drop rule to check first, then set/update the source address.
- The SSH port change example appended `ufw deny 22/tcp` without removing the existing SSH rule. Since UFW rules are order-sensitive and the first match wins, an earlier allow or limit rule could keep port 22 open. I changed the example to delete the old SSH limit rule before adding the deny, with a note for systems that used a plain allow rule.
- The fail2ban jail example used a `#` inline comment after `bantime.maxtime`. Upstream fail2ban configuration comments document `#` for full-line comments and semicolon-style inline comments, so I moved the note onto its own line.
- The custom fail2ban filter used `%(__prefix_line)s`, which is intended for known syslog-style prefixes containing a daemon name. The example log line in the post uses an ISO timestamp and no syslog daemon prefix, so the filter would not match the shown log format. I changed the regex to match the timestamped example directly.
- The username counting command used `awk '{print $9}'`, which reports `invalid` instead of the attempted username for OpenSSH lines such as `Failed password for invalid user admin from ...`. I replaced it with an awk expression that handles both normal and `invalid user` SSH failure log lines.

## Review Notes
- The OpenSSH options, UFW limit behavior, faillock options, fail2ban jail settings, and management commands are otherwise consistent with the consulted documentation.
- On some Ubuntu installations, SSH authentication events may be consumed from the systemd journal or a distribution-specific log path rather than only `/var/log/auth.log`; the post's examples are appropriate for common Ubuntu systems using the default auth log.
