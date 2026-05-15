# Validation Summary: How to Create a Disaster Recovery Runbook for RHEL Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd and systemctl
- systemd journal and journalctl
- firewalld and firewall-cmd
- SELinux audit troubleshooting with ausearch
- RPM package queries
- Linux system health commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 documentation: Using SELinux, troubleshooting SELinux denials - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- systemd systemctl manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd journalctl manual - https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- RPM query documentation from Red Hat - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-rpm-querying
- Local command help for systemctl, journalctl, df, free, and uptime

## Issues Found
No technical issues found.

## Review Notes
The service and port examples intentionally use placeholders, so they require substitution before execution. The SELinux troubleshooting command using `ausearch -m avc -ts recent` is a valid AVC-denial check, but Red Hat's RHEL 9 SELinux troubleshooting documentation recommends checking additional message types such as `USER_AVC`, `SELINUX_ERR`, and `USER_SELINUX_ERR` for a more complete investigation.
