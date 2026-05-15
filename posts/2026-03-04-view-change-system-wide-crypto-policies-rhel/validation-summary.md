# Validation Summary: How to View and Change System-Wide Crypto Policies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- System-wide cryptographic policies
- update-crypto-policies
- TLS
- OpenSSL, GnuTLS, NSS, OpenSSH, and related cryptographic back ends
- FIPS policy mode

## Sources Consulted
- Red Hat Enterprise Linux 8 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 10 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/security_hardening/using-system-wide-cryptographic-policies
- Red Hat Customer Portal: System-wide cryptographic policies in RHEL: https://access.redhat.com/articles/3666211
- update-crypto-policies(8) manual page reference: https://www.mankier.com/8/update-crypto-policies

## Issues Found
No technical issues found.

## Review Notes
The post accurately describes the four main predefined RHEL crypto policies, the use of `update-crypto-policies --show` and `--set`, the need to reboot or restart already-running services after policy changes, and the role of `/etc/crypto-policies/state/CURRENT.pol` and `/etc/crypto-policies/back-ends/`. Red Hat documentation also documents subpolicies such as `FIPS:OSPP`, `DEFAULT:SHA1`, and newer post-quantum subpolicies in recent RHEL releases; the post's shorter treatment is still technically correct for an introductory guide.
