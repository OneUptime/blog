# Validation Summary: How to Implement NIST 800-53 Controls on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NIST SP 800-53
- OpenSCAP and SCAP Security Guide
- Linux Audit/auditd
- SELinux
- PAM faillock and password quality configuration
- RHEL system-wide cryptographic policies and FIPS mode
- dnf-automatic
- AIDE

## Sources Consulted
- NIST: SP 800-53 Rev. 5, Security and Privacy Controls for Information Systems and Organizations - https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- Red Hat Enterprise Linux 9 Security hardening: Scanning the system for configuration compliance and vulnerabilities - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: SCAP Security Guide profiles supported in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scap-security-guide-profiles-supported-in-rhel-9_scanning-the-system-for-configuration-compliance-and-vulnerabilities
- Red Hat Enterprise Linux 9 Security hardening: Auditing the system - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Switching RHEL to FIPS mode - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Using system-wide cryptographic policies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Checking integrity with AIDE - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/checking-integrity-with-aide_security-hardening
- Red Hat Enterprise Linux 9: Managing and monitoring security updates - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/installing-security-updates_managing-and-monitoring-security-updates

## Issues Found
- Corrected the description of RHEL OpenSCAP content. The post said RHEL provides an OpenSCAP profile that maps directly to NIST 800-53, but Red Hat documents OSPP as the General Purpose Operating System Protection Profile, not a dedicated NIST 800-53 baseline.
- Added `mkdir -p /var/log/compliance` before writing OpenSCAP result and report files, because `oscap` will not create the parent output directory automatically.
- Changed the account listing comment from "system accounts" to "human accounts" because the UID filter selects regular user accounts, not system accounts.
- Fixed the empty-password check so it reports only empty shadow password fields. A `!` shadow field indicates a locked password, not an empty password.
- Updated the audit plugin configuration watch from `/etc/audisp/` to `/etc/audit/plugins.d/`, because RHEL 9 integrates audisp functionality into auditd and stores plugin configuration there by default.
- Corrected the auditd comment from "halt on failure" to "low-space actions"; the commands configured email notification and single-user mode for low-space conditions rather than an unconditional halt.
- Fixed the final OpenSCAP result counters to match XCCDF result elements such as `<result>pass</result>` instead of looking for nonexistent `result="pass"` attributes.

## Review Notes
The commands are examples for OS-level hardening, not a complete NIST 800-53 implementation. Several NIST 800-53 controls require organizational, application, network, and documentation controls outside the RHEL host configuration.
