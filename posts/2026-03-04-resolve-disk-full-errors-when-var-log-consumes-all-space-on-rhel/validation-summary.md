# Validation Summary: How to Resolve 'Disk Full' Errors When /var/log Consumes All Space on RHEL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux disk usage tools: df, du, sort, lsof
- rsyslog and logrotate
- systemd-journald and journalctl
- auditd
- LVM, XFS, and fstab

## Sources Consulted
- Red Hat Enterprise Linux 7 Security Guide: Starting the audit service: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-starting_the_audit_service
- Red Hat Enterprise Linux 8 Security hardening: Auditing the system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/auditing-the-system_security-hardening
- auditd.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/auditd.conf.5.html
- journalctl systemd manual: https://www.freedesktop.org/software/systemd/man/255/journalctl.html
- journald.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/journald.conf.5.html
- logrotate.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/logrotate.conf.5.html
- lsof FAQ: https://lsof.readthedocs.io/en/stable/faq/
- Local command help output for journalctl, systemctl, lsof, and logrotate.

## Issues Found
- The post listed `/var/log/syslog` as a common RHEL log file. RHEL commonly uses `/var/log/messages` for general system messages, while `/var/log/syslog` is typical of Debian-derived systems. Changed the RHEL-focused culprit list to reference `/var/log/messages` only.
- The journal cleanup command used `journalctl --vacuum-size=100M` by itself. The journalctl manual notes that vacuuming operates on archived journal files, and combining it with `--rotate` first makes the cleanup take active journal files into account. Changed the command to `sudo journalctl --rotate --vacuum-size=100M`.
- The auditd restart command used `sudo systemctl restart auditd`. Red Hat documentation says `service auditd <action>` is the correct way to perform auditd actions such as restart, while `systemctl` should be used only for enable and status. Changed it to `sudo service auditd restart`.

## Review Notes
- The logrotate, journald, and auditd configuration directives are syntactically valid. Red Hat recommends `keep_logs` for stricter audit environments to avoid overwriting audit records, but `max_log_file_action = ROTATE` with `num_logs` is a valid space-limiting configuration.
- The LVM/fstab example assumes an existing volume group named `vg_root` and does not show a full migration procedure for preserving existing `/var/log` content. It is acceptable as a brief example, but a future revision could mention backing up or copying existing logs before mounting the new filesystem.
