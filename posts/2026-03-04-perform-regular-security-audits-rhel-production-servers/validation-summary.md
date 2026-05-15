# Validation Summary: How to Perform Regular Security Audits on RHEL Production Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP
- SCAP Security Guide
- auditd, auditctl, and ausearch
- DNF update advisories
- Linux command-line security checks
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Viewing profiles for configuration compliance" and OpenSCAP scan/remediation procedures: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, SCAP Security Guide profile tables and auditd usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- OpenSCAP User Manual, review-mode remediation generation: https://static.open-scap.org/openscap-1.3/oscap_user_manual.html
- DNF Command Reference, updateinfo and security advisory filtering options: https://dnf.readthedocs.io/en/stable/command_ref.html
- Linux audit ausearch manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- Linux audit auditctl manual page: https://man7.org/linux/man-pages/man8/auditctl.8.html

## Issues Found
- The OpenSCAP profile listing command used `grep "Profile:"`, but Red Hat's documented `oscap info` output lists profile entries using `Title:` and `Id:` under `Profiles:`. Changed it to grep for `Title:` and `Id:` so it actually surfaces profile names and IDs.
- The post described a CIS Level 1 Server scan but used `xccdf_org.ssgproject.content_profile_cis`, which Red Hat documents as the CIS Level 2 Server profile for current RHEL 9 content. Changed the scan and cron examples to `xccdf_org.ssgproject.content_profile_cis_server_l1`.
- The remediation command used `--result-id ""`, which is not the documented way to select result-oriented remediations. Changed it to the CIS Level 1 Server TestResult ID and used OpenSCAP's documented `--output` option for the generated script.
- The auditd example searched for `-k unauthorized-access` without noting that such results only appear when matching audit rules are tagged with that key. Updated the comment to make the prerequisite clear.
- The DNF critical advisory command used `--severity Critical`, but DNF documents the option as `--sec-severity=<severity>` or `--secseverity=<severity>`. Changed it to `--sec-severity=Critical`.

## Review Notes
The examples are RHEL 9 specific because they use `/usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml`. Profile availability and benchmark versions can vary by RHEL minor release and installed `scap-security-guide` package version, so administrators should confirm profile IDs with `oscap info` on the target system.
