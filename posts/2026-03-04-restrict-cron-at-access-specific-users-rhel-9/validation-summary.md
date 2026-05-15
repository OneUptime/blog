# Validation Summary: How to Restrict Cron and At Access to Specific Users on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- cron/cronie
- crontab
- at/atd
- Linux access control files
- Bash shell commands

## Sources Consulted
- Red Hat Enterprise Linux 6 Deployment Guide, "Controlling Access to Cron": https://docs.redhat.com/de/documentation/red_hat_enterprise_linux/6/html/deployment_guide/ch-automating_system_tasks
- Cronie `crontab(1)` manual page: https://www.man7.org/linux/man-pages/man1/crontab.1.html
- Red Hat Enterprise Linux 4 System Administration Guide, "Controlling Access to At and Batch": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/system_administration_guide/at_and_batch-controlling_access_to_at_and_batch
- `at.allow`/`at.deny` manual page: https://manpages.ubuntu.com/manpages/jammy/man5/at.deny.5.html
- ComplianceAsCode OpenSCAP Security Guide for RHEL 9, "Restrict at and cron to Authorized Users if Necessary": https://complianceascode.github.io/content-pages/guides/ssg-rhel9-guide-bsi.html

## Issues Found
- The post said that if neither `/etc/cron.allow` nor `/etc/cron.deny` exists, all users can use cron. Current cronie `crontab(1)` documentation says only the superuser may use `crontab` when neither file exists. Updated the precedence diagram, key point, and audit script default message to say only root can use cron in that state.
- The post said an existing crontab will not run after the user is removed from `.allow` or added to `.deny`. Cronie documents that `cron.allow` and `cron.deny` restrict use of the `crontab` command, not execution of already-installed cron jobs. Updated the cleanup warning to say existing jobs continue to run until the crontab is removed.

## Review Notes
The remaining commands and examples are syntactically valid for standard RHEL-style systems. The access files must be readable by users invoking `crontab`; the post's `0644` examples are consistent with that behavior, although hardened compliance profiles may also impose additional ownership, permission, or deny-file removal requirements.
