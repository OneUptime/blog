# Validation Summary: How to Apply the FIPS:STIG Combined Cryptographic Policy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide cryptographic policies
- FIPS mode
- DISA STIG
- OpenSSH/libssh crypto policy scoping
- OpenSSL, GnuTLS, NSS, and Java crypto policy back ends

## Sources Consulted
- Red Hat Enterprise Linux 9 Security Hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security Hardening: Switching RHEL to FIPS mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- DISA RHEL 9 STIG finding V-258241, mirrored by STIG Viewer from the DISA STIG Library: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-258241
- DISA RHEL 9 STIG finding V-258230, mirrored by STIG Viewer from the DISA STIG Library: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9/2026-02-05/finding/V-258230
- Local OpenSSH and OpenSSL command help/output for command syntax checks.

## Issues Found
- The post incorrectly treated `FIPS:OSPP` as the STIG combined policy. Red Hat documents `FIPS:OSPP` as a Common Criteria / OSPP subpolicy, while the current RHEL 9 STIG uses a custom `STIG.pmod` applied as `FIPS:STIG`. Updated the post to create and apply `STIG.pmod`.
- The original STIG description implied that `FIPS:OSPP` satisfies both FIPS and STIG requirements. Updated the wording to describe the narrower, correct claim: FIPS mode plus the STIG subpolicy addresses the STIG system-wide cryptographic policy requirement.
- The SSH cipher list was wrong for the current STIG guidance and included CBC ciphers. Updated it to the STIG-required OpenSSH/libssh AES GCM and CTR algorithms.
- The post stated that `FIPS:OSPP` imposes 3072-bit RSA and DH minimums for the STIG path. Updated the STIG path to the current STIG minimum of 2048-bit RSA and the FIPS base-policy key-size checks.
- The custom policy snippet used deprecated `ssh_cipher` syntax. Updated it to the current scoped syntax `cipher@SSH`.
- The post said policy changes take effect immediately for new connections. Red Hat recommends restarting the system to make cryptographic settings effective for already running services and applications, so the instructions now include a reboot after applying the policy.
- The 1024-bit RSA generation example could be misleading because policy enforcement applies to use/acceptance of keys and generated backend configuration, not necessarily to every key-generation command. Replaced it with a check of `/etc/crypto-policies/state/CURRENT.pol`.

## Review Notes
The post is now aligned with the current RHEL 9 STIG cryptographic policy check/fix text and Red Hat's RHEL 9 crypto-policies documentation. Full FIPS or STIG compliance still depends on the rest of the system configuration, installation state, validated module status, and auditor-approved exceptions.
