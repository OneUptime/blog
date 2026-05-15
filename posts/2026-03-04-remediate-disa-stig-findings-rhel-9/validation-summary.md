# Validation Summary: How to Remediate DISA STIG Findings on RHEL Step by Step

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DISA STIG
- OpenSCAP and SCAP Security Guide
- FIPS mode
- OpenSSH server configuration
- SELinux
- AIDE
- PAM, authselect, and pam_faillock
- libpwquality
- auditd
- Linux sysctl configuration

## Sources Consulted
- Red Hat RHEL 9 Security hardening: Switching RHEL to FIPS mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat RHEL 9 Security hardening: Scanning the system for configuration compliance and vulnerabilities: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat RHEL 9 Configuring authentication and authorization: authselect and with-faillock: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat RHEL 9 Security hardening: Starting and controlling auditd: https://docs.redhat.com/documentation/enus/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- OpenSCAP Security Guide for RHEL 9 STIG profile: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-stig.html
- Linux-PAM faillock.conf manual content: https://man.archlinux.org/man/core/pam/faillock.conf.5.en
- libpwquality pwquality.conf manual: https://manpages.ubuntu.com/manpages/questing/en/man5/pwquality.conf.5.html
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config
- auditd.conf manual: https://man7.org/linux/man-pages/man5/auditd.conf.5.html
- NIST XCCDF specification reference: https://www.nist.gov/publications/specification-extensible-configuration-checklist-description-format-xccdf-version-114

## Issues Found
- The OpenSCAP result-count examples searched for `result="pass"` and `result="fail"` attributes. XCCDF rule results store pass/fail as result elements, so those greps would commonly return zero. Changed the examples to search for `<result>pass</result>` and `<result>fail</result>`.
- The FIPS remediation implied that running `fips-mode-setup --enable` alone is sufficient for FIPS compliance. Red Hat documents that enabling FIPS during installation is recommended for compliance and that existing keys may need regeneration. Added that caveat while keeping the remediation command.
- The account lockout snippet wrote `/etc/security/faillock.conf` but did not enable pam_faillock in the authselect-managed PAM stack. Added `authselect enable-feature with-faillock`.
- The auditd snippet edited `/etc/audit/auditd.conf` after starting auditd but did not reload the daemon configuration. Added `service auditd restart`, matching Red Hat's documented method for controlling auditd.

## Review Notes
The commands are valid RHEL 9-oriented examples, but real STIG remediation should still be driven from the specific scan findings and the exact DISA/STIG content version in use. Some controls may also require site-specific tailoring, exceptions, or additional audit rules beyond the representative snippets in the post.
