# Validation Summary: How to Build a Security Hardening Checklist for RHEL Servers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux filesystem partitioning and mount options
- DNF and dnf-automatic
- systemd services and targets
- OpenSSH server configuration
- PAM, pam_wheel, and pam_pwquality
- sudoers configuration
- firewalld
- Linux sysctl network hardening
- auditd and rsyslog
- OpenSCAP and SCAP Security Guide

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Managing software with the DNF tool, Automating software updates: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters, firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 Security hardening, supported SCAP Security Guide profiles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Customer Portal, default password expiration with `/etc/login.defs`: https://access.redhat.com/articles/1343
- Red Hat Customer Portal, pam_pwquality password complexity policy for RHEL 8/9/10: https://access.redhat.com/solutions/7019436
- firewalld `firewall-cmd` documentation: https://firewalld.org/documentation/utilities/firewall-cmd.html
- sudoers manual reference for `Defaults logfile`: https://www.mankier.com/5/sudoers

## Issues Found
- The password policy section described password aging and complexity together but only edited `/etc/login.defs`. On RHEL 9, `/etc/login.defs` is appropriate for new-account aging defaults, while local password quality is enforced through `pam_pwquality` configuration. Added an `/etc/security/pwquality.conf.d/00-hardening.conf` example with `minlen` and `minclass`, and removed the misleading `PASS_MIN_LEN` check.
- The root SSH hardening command only replaced a commented `#PermitRootLogin` line and would not fix an existing uncommented or absent setting. Replaced it with an `/etc/ssh/sshd_config.d/01-hardening.conf` drop-in and added `sshd -t` before restarting SSH.
- The `su` restriction command appended a PAM line every time it ran. Updated it to uncomment or replace an existing `pam_wheel` line and only append the line if it is missing.
- The sudo logging example wrote a sudoers drop-in without validating syntax. Changed the command to write the drop-in deterministically and added `visudo -cf /etc/sudoers.d/logging`.

## Review Notes
- The OpenSCAP command uses `xccdf_org.ssgproject.content_profile_cis`, which is the CIS Level 2 Server profile for supported RHEL 9 releases. Administrators who want Level 1 Server should use `xccdf_org.ssgproject.content_profile_cis_server_l1` instead.
- The checklist is intentionally general. Production baselines should still be tailored for application needs, compliance target, remote access model, and whether IPv6 is required.
