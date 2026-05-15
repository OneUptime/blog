# Validation Summary: How to Configure auditd for STIG Compliance on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit subsystem
- auditd
- auditctl and augenrules
- DISA STIG
- OpenSCAP and SCAP Security Guide

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 auditing documentation, including auditd service control, audit rule loading, and sample STIG audit rules: https://docs.redhat.com/documentation/enus/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 SCAP profile and OpenSCAP usage documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Linux Audit auditd.conf(5) manual page: https://man.archlinux.org/man/auditd.conf.5.en
- DoD Cyber Exchange STIG document library for RHEL 9 STIG availability: https://public.cyber.mil/stigs/downloads/
- Public RHEL 9 STIG rule mirrors for auditd threshold checks, including V-258156, V-258158, V-258159, V-258160, and V-258168: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/

## Issues Found
- The auditd configuration used `freq = 50`. RHEL 9 STIG auditd checks expect `freq = 100` for periodic flushing when incremental flushing is used, so this was changed to `freq = 100`.
- The auditd configuration used `admin_space_left = 50`. Current RHEL 9 STIG rule text expects `admin_space_left = 5%` for the 95 percent storage-capacity threshold, so this was changed to `admin_space_left = 5%`.
- `verify_email` appeared after `action_mail_acct`. The auditd.conf manual states that `verify_email` must be specified before `action_mail_acct` for the configured value to be applied, so the two lines were reordered.
- The verification command used `systemctl is-active auditd`. Red Hat's auditd service documentation says `systemctl` should only be used for `enable` and `status` actions with auditd; operational service interaction should use `service auditd <action>`. This was changed to `sudo service auditd status`.
- The guide enabled immutable audit rules with `-e 2` but did not mention the operational consequence. A note was added that immutable mode requires a reboot before audit rules can be changed again.

## Review Notes
The article remains a starting point, not a complete guarantee of STIG compliance. Red Hat recommends using the installed sample audit rules and SCAP-based compliance tooling because STIG content changes over time.
