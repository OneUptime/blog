# Validation Summary: How to Fix 'Connection Refused' on Port 22 SSH on RHEL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Red Hat Enterprise Linux
- OpenSSH server / sshd
- systemd
- firewalld
- SELinux
- semanage
- iptables
- netcat / nc
- TCP Wrappers

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, OpenSSH: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-openssh
- Red Hat Enterprise Linux 10 Securing networks, setting a non-default SSH port: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/securing_networks/setting-a-non-default-port-for-ssh
- Red Hat Enterprise Linux 10 Configuring firewalls and packet filters, firewalld services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_firewalls_and_packet_filters/controlling-network-traffic-using-firewalld
- Red Hat Enterprise Linux 8 Securing networks, runtime and permanent firewalld settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/runtime-and-permanent-settings_using-and-configuring-firewalld
- Red Hat Enterprise Linux 8.0 Release Notes, tcp_wrappers removal: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/pdf/8.0_release_notes/80-release-notes.pdf
- Red Hat Customer Portal, Replacing TCP Wrappers in RHEL 8 and 9: https://access.redhat.com/solutions/3906701
- OpenSSH sshd manual page: https://man.openbsd.org/sshd
- OpenSSH sshd_config manual page: https://man.openbsd.org/sshd_config

## Issues Found
- The post instructed readers to check `/etc/hosts.allow` and `/etc/hosts.deny` for TCP Wrapper blocks without a version caveat. This is outdated for RHEL 8 and later because `tcp_wrappers` was removed and Red Hat recommends other mechanisms such as firewalld or application-specific configuration. Updated the comment to say this check applies to RHEL 7 and older.

## Review Notes
The remaining commands and explanations are technically valid for a RHEL SSH troubleshooting workflow. The post could be improved in the future by noting that `semanage` may require the `policycoreutils-python-utils` package on modern RHEL systems, but the command itself is correct.
