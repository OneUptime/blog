# Validation Summary: How to Schedule Automated AIDE Integrity Checks with cron on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AIDE
- cron / cronie
- Bash scripting
- logrotate
- s-nail mail notifications

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Checking integrity with AIDE": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/checking-integrity-with-aide_security-hardening
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, package and command changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf
- Red Hat Customer Portal, "mailx is not available in RHEL9": https://access.redhat.com/solutions/6999497
- crontab(5) Linux manual page: https://man7.org/linux/man-pages/man5/crontab.5.html
- AIDE aide(1) manual page: https://manpages.debian.org/testing/aide/aide.1.en.html
- logrotate(8) local manual page

## Issues Found
- The wrapper script described AIDE exit code `7` as an error by saying only `1-6` represented changes. AIDE uses bitmask exit codes for check/update results, where `1`, `2`, and `4` represent added, removed, and changed files, and combinations such as `7` still mean changes were reported. Updated the README and Mermaid diagram to show `1-7` as changes and `14+` as errors.
- The email command used `mail`, which is not the RHEL 9 command-line mail utility. Updated the wrapper script to use `/usr/bin/s-nail`, matching RHEL 9's replacement for mail/mailx-style command-line sending.
- The `nice` and `ionice` cron examples omitted the user field even though the surrounding examples use `/etc/cron.d` syntax. Updated those examples to include `root` and state they are `/etc/cron.d` entries.
- The maintenance-mode snippet said to add the check near the top of the script, but it writes to `${LOGFILE}` and should be placed after the log directory is created. Updated the placement instruction.
- The planned-maintenance database update used `cp` for `aide.db.new.gz`. Red Hat documentation says to remove the `.new` substring to start using the updated database, so the command was changed to `mv`.

## Review Notes
- The post assumes AIDE has already been installed and initialized and that outbound local mail delivery has been configured. Those assumptions are reasonable for this focused scheduling article, but a future revision could call them out explicitly.
