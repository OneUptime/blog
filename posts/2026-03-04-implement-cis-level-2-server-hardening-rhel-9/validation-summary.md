# Validation Summary: How to Implement CIS Level 2 Server Hardening on RHEL

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CIS Level 2 Server Benchmark
- SELinux
- RHEL system-wide cryptographic policies
- Linux auditd / augenrules
- sysctl kernel hardening
- systemd-coredump
- PAM pam_wheel
- OpenSCAP / SCAP Security Guide

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/
- Red Hat RHEL 9 SCAP Security Guide supported profile table: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- ComplianceAsCode RHEL 9 CIS Level 2 guide: https://complianceascode.github.io/content-pages/guides/ssg-rhel9-guide-cis.html
- ComplianceAsCode RHEL 9 CIS profile source: https://github.com/ComplianceAsCode/content/blob/master/products/rhel9/profiles/cis.profile
- systemd RHEL 9 coredump.conf documentation: https://redhat-plumbers.github.io/systemd-rhel9/coredump.conf.html

## Issues Found
- The post claimed it focused only on controls that are in Level 2 but not Level 1. Because CIS Level 2 extends Level 1 and the article includes inherited Level 1 controls, I changed the wording to say the guide highlights stricter controls and examples commonly validated by the Level 2 Server profile.
- The crypto policy section recommended setting the whole system to `FUTURE` and described that as the Level 2 requirement. Current RHEL 9 CIS content uses `DEFAULT:NO-SHA1` plus custom CIS crypto policy modules for SSH CBC ciphers, weak SSH ciphers, weak SSH MACs, weak MACs, and rpm SHA-1 where applicable. I replaced the example with the ComplianceAsCode-aligned custom policy module approach.
- The kernel module audit rule only covered `init_module` and `delete_module` on `b64` and omitted `auid` filters. I updated it to include `create_module`, `init_module`, `finit_module`, `delete_module`, and `query_module` for both `b64` and `b32`, with `auid>=1000` and `auid!=unset`.
- The `su` section described allowing `wheel` group members, but the RHEL 9 CIS Level 2 profile validates `pam_wheel.so use_uid group=sugroup` and an empty `sugroup`. I changed the example to create and empty `sugroup`, then add the required PAM line.

## Review Notes
The post remains a practical subset of CIS Level 2 hardening rather than a complete remediation playbook. Readers should still run the referenced OpenSCAP scan and review site-specific exceptions, especially for controls that can affect containers, legacy SSH clients, support tooling, or administrative workflows.
