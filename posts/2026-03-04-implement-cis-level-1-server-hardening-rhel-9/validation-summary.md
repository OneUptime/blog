# Validation Summary: How to Implement CIS Level 1 Server Hardening on RHEL

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CIS Level 1 Server hardening
- Linux filesystem mount options and kernel modules
- AIDE
- chrony
- sysctl networking parameters
- firewalld
- rsyslog
- Linux audit / auditd / augenrules
- OpenSSH server configuration
- PAM, libpwquality, and pam_faillock
- OpenSCAP and SCAP Security Guide

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 authentication and authorization documentation for authselect and `with-faillock`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- OpenSCAP Security Guide for RHEL 9 CIS Level 1 Server profile: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis_server_l1.html
- Red Hat Enterprise Linux 9 time synchronization documentation for chrony: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Local `pam_faillock(8)` man page
- Local `pwquality.conf(5)` man page

## Issues Found
- The audit backlog command attempted to modify `-b` inside `/etc/audit/rules.d/audit.rules`. That file or line may not exist on a normal RHEL 9 system, so the command could silently leave the backlog limit unchanged. I changed it to create `/etc/audit/rules.d/10-cis-audit-control.rules` with `-b 8192`, which `augenrules` reads from `/etc/audit/rules.d/`.
- The PAM section configured `/etc/security/faillock.conf` but did not ensure that the PAM stack actually includes `pam_faillock`. On RHEL 9 systems managed by authselect, Red Hat and the CIS OpenSCAP content use the `with-faillock` authselect feature. I added `authselect enable-feature with-faillock` and `authselect apply-changes -b`.
- The OpenSCAP verification command assumed the scanner and SCAP content were already installed. Red Hat documents `openscap-scanner` and `scap-security-guide` as prerequisites for scanning with `/usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml`, so I added the package installation command before the scan.

## Review Notes
The post is a practical hardening guide, not a complete CIS benchmark implementation. The listed audit rules and hardening settings are technically valid examples, but a production compliance effort should still run the full OpenSCAP profile and review environment-specific exceptions before applying changes broadly.
