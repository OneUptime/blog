# Validation Summary: How to Monitor Postfix Mail Queues and Logs on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- Postfix mail queues
- Postfix logging
- systemd journal
- rsyslog `/var/log/maillog`
- `pflogsumm`
- Shell scripting and cron

## Sources Consulted
- Postfix `postqueue(1)` manual: https://www.postfix.org/postqueue.1.html
- Postfix `postsuper(1)` manual: https://www.postfix.org/postsuper.1.html
- Postfix `postcat(1)` manual: https://www.postfix.org/postcat.1.html
- Postfix `qshape(1)` manual: https://www.postfix.org/qshape.1.html
- Postfix QSHAPE_README: https://www.postfix.org/QSHAPE_README.html
- Red Hat Enterprise Linux 9 logging documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- `pflogsumm(1)` manual: https://man.archlinux.org/man/extra/pflogsumm/pflogsumm.1.en

## Issues Found
- The queue listing explanation said messages without `*` are deferred. Postfix documents `*` as active and `!` as hold; unmarked messages are not accurately described as all deferred. Updated the sentence to describe only the documented markers.
- The queue count example used `postqueue -p | grep -c "^[A-F0-9]"`, which is fragile against output formatting and queue ID formats. Replaced it with `postqueue -j | wc -l`, using the documented JSON Lines queue listing available in modern Postfix.
- The `postqueue -s example.com` comment described this as flushing messages for a domain. Postfix documents `-s` as scheduling immediate delivery for a named site through the fast flush service, and only for eligible sites. Updated the comment to include that caveat.
- The `pflogsumm /var/log/maillog` example was labeled as analyzing today's log, but without `-d today` it analyzes the provided log file. Added `-d today`.
- The `pflogsumm --detail 10` example was labeled as analyzing a specific date range, but `--detail` sets report detail limits. Updated the comment to describe the actual behavior.
- The `postfix status` comment said it shows queue manager statistics. The `postfix` control command reports Postfix service status for that usage. Updated the comment accordingly.

## Review Notes
Most Postfix queue management commands and examples were accurate. The `find /var/spool/postfix/... -type f | wc -l` examples are acceptable for queue directory file counts, but `postqueue -j` is a better interface for counting messages visible through Postfix.
