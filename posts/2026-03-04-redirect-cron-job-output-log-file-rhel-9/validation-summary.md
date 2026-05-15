# Validation Summary: How to Redirect Cron Job Output to a Log File on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- cron and crontab syntax
- Bash/POSIX-style shell redirection
- stdout and stderr file descriptors
- mail delivery with Postfix and s-nail
- logrotate
- moreutils `ts`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying mail servers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Red Hat Customer Portal, "Where is /etc/cron.daily/logrotate?": https://access.redhat.com/solutions/7131336
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/considerations_in_adopting_rhel_9
- Fedora Packages, `moreutils` in EPEL 9: https://packages.fedoraproject.org/pkgs/moreutils/moreutils/epel-9.html
- GNU Bash Reference Manual, Redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- `crontab(5)` manual page, reviewed locally
- `logrotate(8)` / `logrotate.conf(5)` manual pages, reviewed locally
- GNU Coreutils `date --help`, reviewed locally

## Issues Found
- The post said to install `moreutils` with `sudo dnf install moreutils -y` without noting that `moreutils` is not part of the base RHEL 9 package set and is commonly provided by EPEL. I added a short comment before the command so readers know an additional repository may be required.
- The post described Postfix as the default on RHEL. Red Hat documents Postfix as the supported MTA for mail server use, but also states it may not be available by default if the mail server package was not selected during installation. I changed the text to say Postfix is the standard documented MTA and may need to be installed.
- The wrapper script used the `mail` command, but RHEL 9 replaced the old `mailx` mail processing system with `s-nail`. I changed the prerequisite package to `s-nail` and updated the wrapper script to call `s-nail -s`.
- The `delaycompress` explanation implied it is specifically for processes still writing to the old log. The directive actually delays compression until the next rotation cycle. I tightened that explanation.

## Review Notes
The cron syntax, `MAILTO` behavior, escaped `%` handling in crontabs, stdout/stderr redirection order, `/dev/null` examples, date format examples, and logrotate command flags/configuration directives were consistent with the checked manuals. On RHEL 9, logrotate is run by a systemd timer rather than `/etc/cron.daily/logrotate`; the post's configuration examples remain valid because they create files under `/etc/logrotate.d/`.
