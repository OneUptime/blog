# Validation Summary: How to Audit User Login History on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Linux login auditing
- util-linux `last` and `lastb`
- shadow-utils `lastlog`
- GNU coreutils `who`
- procps-ng `w`
- systemd `journalctl`
- OpenSSH service logs
- `/var/log/auth.log`
- `logrotate`
- Shell pipelines using `grep`, `awk`, `sort`, `uniq`, and `head`

## Sources Consulted
- Local Ubuntu 24.04.3 LTS `last(1)` / `lastb(1)` man page and `last --help`; upstream/Debian man page: https://manpages.debian.org/testing/util-linux/last.1.en.html
- Local Ubuntu 24.04.3 LTS `lastlog(8)` man page and `lastlog --help`
- Local Ubuntu 24.04.3 LTS `journalctl(1)` man page and `journalctl --help`; upstream systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local Ubuntu 24.04.3 LTS `who(1)` man page; GNU Coreutils manual: https://www.gnu.org/software/coreutils/manual/html_node/who-invocation.html
- Local Ubuntu 24.04.3 LTS `w(1)` man page
- Local Ubuntu 24.04.3 LTS `logrotate(8)` man page and debug parse checks
- Local Ubuntu 24.04.3 LTS `systemctl` output confirming `ssh.service` as the OpenSSH server unit, with `sshd.service` as an alias

## Issues Found
- `last -F` was described as showing full hostnames. Changed the description to full login/logout timestamps and added `last -w` for full user and domain names, matching `last(1)`.
- The systemd journal was described as containing all binary login databases. Changed the wording to say it stores service and authentication logs, because `wtmp`, `btmp`, and `lastlog` remain separate binary databases.
- The first `journalctl` example claimed to show all authentication logs and used `-u ssh`. Changed it to `ssh.service` and described it as SSH service logs since yesterday.
- Several IP-counting examples used `awk '{print $3}'` without filtering out `last`/`lastb` footer and non-login rows. Added an IP-like field filter so counts are not polluted by footer dates or system entries.
- The `auth.log` sudo example claimed to show the last 24 hours but only tailed recent matching lines. Changed the comment to "Recent sudo usage."
- The root SSH login grep could match unrelated usernames containing `root`. Tightened it to match `for root`.
- The `lastlog` explanation implied every never-used service account could potentially be used. Added a caveat that many service accounts are locked or use non-login shells.
- The `logrotate` snippet used an inline comment after `rotate 12`, which `logrotate` rejects as a bad rotation count. Moved the comment to its own line and verified the snippet parses in debug mode.

## Review Notes
- The post is technically relevant and command-focused, so it was reviewed as a code/technical tutorial.
- `/var/log/auth.log` is accurate for typical Ubuntu systems with rsyslog-style auth logging, but journal queries are often the more portable path across systemd-based configurations.
