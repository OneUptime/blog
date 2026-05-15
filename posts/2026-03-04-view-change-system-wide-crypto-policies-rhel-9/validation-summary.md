# Validation Summary: How to View and Change System-Wide Crypto Policies on RHEL 9

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide cryptographic policies
- `update-crypto-policies`
- TLS, OpenSSL, GnuTLS, NSS, OpenJDK
- OpenSSH and libssh
- Kerberos, BIND DNSSEC, Libreswan/IPsec
- FIPS mode and FIPS crypto policy

## Sources Consulted
- Red Hat Enterprise Linux 9 Security Hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security Hardening, "Switching RHEL to FIPS mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, "Crypto-policies, RHEL core cryptographic components, and protocols": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_security_considerations-in-adopting-rhel-9
- `update-crypto-policies(8)` manual page reference: https://www.mankier.com/8/update-crypto-policies
- `crypto-policies(7)` manual page reference: https://www.mankier.com/7/crypto-policies
- Red Hat crypto-policies RHEL 9 module definitions: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/tree/rhel9/policies/modules
- OpenSSH `ssh -Q` local help output for supported query names.
- OpenSSL command-line local output for `openssl ciphers -v` syntax.

## Issues Found
No technical issues found.

## Review Notes
The exact algorithms and key sizes in predefined RHEL crypto policies can change during the RHEL lifecycle as Red Hat updates security standards. The post correctly describes this topic for RHEL 9 at review time, including the distinction that setting the `FIPS` crypto policy alone does not make a system FIPS compliant.
