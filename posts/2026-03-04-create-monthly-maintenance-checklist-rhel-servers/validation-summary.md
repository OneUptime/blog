# Validation Summary: How to Create a Monthly Maintenance Checklist for RHEL Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management
- dnf-plugins-core needs-restarting
- systemd and journalctl
- logrotate
- chrony
- Linux shadow password files and lastlog
- SELinux audit logs and ausearch
- OpenSCAP and SCAP Security Guide

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_updating-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Customer Portal, "Identify packages that will require a system reboot after an update": https://access.redhat.com/solutions/27943
- dnf-plugins-core documentation, "DNF needs-restarting Plugin": https://dnf-plugins-core.readthedocs.io/en/latest/needs_restarting.html
- DNF5 documentation, "Remove Command": https://dnf5.readthedocs.io/en/latest/commands/remove.8.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- chrony chronyc manual: https://chrony-project.org/doc/4.4/chronyc.html
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux
- Red Hat Enterprise Linux 9 documentation, "Security hardening": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Linux shadow(5) manual: https://man7.org/linux/man-pages/man5/shadow.5.html
- Linux lastlog(8) manual: https://man7.org/linux/man-pages/man8/lastlog.8.html

## Issues Found
- The command for detecting accounts with no password also matched a shadow password field of `!`. In `/etc/shadow`, an empty password field means no password is set, while a field beginning with `!` means the password is locked. Updated the command to match only empty password fields.
- The command intended to list users who had not logged in for 90 days parsed `lastlog` output incorrectly and did not actually enforce a 90-day threshold. Replaced it with `lastlog --before 90`, which is the supported option for records older than the specified number of days.

## Review Notes
- The `systemctl is-active sshd firewalld chronyd auditd crond` command prints each unit state, but its aggregate exit status should not be treated as proof that every listed service is active.
- The OpenSCAP command is RHEL 9-specific because it references `ssg-rhel9-ds.xml`; the post's title is general RHEL, but the command is valid for RHEL 9 systems with the required OpenSCAP and SCAP Security Guide packages installed.
