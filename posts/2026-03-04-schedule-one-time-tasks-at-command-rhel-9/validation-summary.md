# Validation Summary: How to Schedule One-Time Tasks with the at Command on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- at, atq, atrm, atd, and batch
- systemd service management and drop-in overrides
- Linux shell commands and heredocs
- at.allow and at.deny access control

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Scheduling a Job to Run at a Specific Time Using at": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Scheduling a Job to Run on System Load Drop Using batch": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- Red Hat Enterprise Linux 9 documentation, "Using systemd unit files to customize and optimize your system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_systemd_unit_files_to_customize_and_optimize_your_system/using_systemd_unit_files_to_customize_and_optimize_your_system
- Red Hat blog, "How to schedule tasks using the Linux 'at' command": https://www.redhat.com/en/blog/linux-at-command
- Red Hat-flavored atd(8) manual page reference: https://www.unix.com/man-page/redhat/8/atd/
- systemd.service(5) local manual page for ExecStart override semantics

## Issues Found
- The post stated that the default `batch` load threshold on RHEL is `1.5`. Red Hat documentation and Red Hat-flavored `atd(8)` references describe the default as `0.8`, so the post now says `0.8`.
- The `atd` systemd override replaced `ExecStart` with `/usr/sbin/atd -l 0.8`. Red Hat examples show the packaged service running `atd` with `-f` under systemd, so the override now uses `/usr/sbin/atd -f -l 0.8`.

## Review Notes
The remaining examples are consistent with Red Hat documentation: `atd` is managed by systemd, jobs are submitted through standard input or an interactive `at>` prompt, `atq` lists pending jobs, `atrm` removes jobs, `at -c` displays queued job content, and access control is handled by `/etc/at.allow` and `/etc/at.deny`. On newer RHEL installations, administrators may prefer checking `journalctl -u atd` in addition to `/var/log/cron`, depending on rsyslog/journald configuration.
