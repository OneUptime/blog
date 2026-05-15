# Validation Summary: How to Configure FIPS 140-3 Compliant Cryptography on RHEL

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- FIPS 140-3
- RHEL system-wide cryptographic policies
- OpenSSL 3 FIPS provider
- OpenSSH
- GnuTLS
- NSS
- libgcrypt
- LUKS2 / cryptsetup

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Switching RHEL to FIPS mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Product Compliance, FIPS validation status: https://access.redhat.com/compliance/fips
- Red Hat Knowledgebase, RHEL core cryptographic components: https://access.redhat.com/articles/3655361
- NIST FIPS 140-3 publication page: https://csrc.nist.gov/pubs/fips/140-3/final
- NIST announcement that FIPS 140-3 supersedes FIPS 140-2 and references ISO/IEC 19790: https://www.nist.gov/news-events/news/2019/05/announcing-approval-and-issuance-fips-140-3-security-requirements
- OpenSSL 3 FIPS module documentation: https://docs.openssl.org/3.3/man7/fips_module/
- GnuTLS `gnutls-cli` invocation documentation: https://gnutls.org/manual/html_node/gnutls_002dcli-Invocation.html
- NSS `modutil` documentation: https://nss-crypto.org/reference/security/nss/legacy/tools/modutil/index.html

## Issues Found
- The introduction implied a broad RHEL validation guarantee. Updated it to identify RHEL 9 specifically and to tell readers to verify the validation status for their exact minor release and package versions.
- The FIPS enablement section implied that post-install `fips-mode-setup --enable` by itself provides full compliance. Added Red Hat's caveat that FIPS should be enabled during installation when compliance is the goal, and used the documented `reboot` command.
- The OpenSSL configuration check pointed only at `/etc/pki/tls/fips_local.cnf`, which is not a general FIPS module status file. Changed the command to inspect both OpenSSL and local FIPS configuration for provider and crypto-policy settings.
- The symmetric algorithm list named specific AES modes without accounting for RHEL crypto-policy restrictions by protocol and component. Reworded the list to avoid overclaiming mode availability and removed "deprecated" from 3DES because modern NIST guidance disallows it for new encryption use.
- The digital signature list incorrectly claimed EdDSA / Ed25519 / Ed448 as approved for RHEL FIPS-mode SSH/OpenSSL configurations. Moved those algorithms to a not-approved note for RHEL FIPS mode.
- The TLS section said TLS 1.2 and 1.3 are available only in FIPS mode. Corrected this to say RHEL 9 supports TLS 1.2 and 1.3, and added the FIPS-mode TLS 1.2 Extended Master Secret requirement.
- The SSH section used `ssh -Q` as if it showed final FIPS policy restrictions. Replaced it with checks of the generated crypto-policy OpenSSH backend configuration and clarified that `ssh -Q` lists OpenSSH-supported algorithms.
- The OpenSSL integrity section claimed the command verified a module checksum. Reworded it to say it checks whether the FIPS provider is loaded.
- The GnuTLS verification command used `gnutls-cli --list | grep -i fips`, which is not the documented FIPS-mode status check. Replaced it with `gnutls-cli --fips140-mode`.

## Review Notes
The guide is now technically accurate as a practical RHEL 9 FIPS-mode configuration overview. Future improvements could add exact package/certificate mappings for a specific RHEL minor release, but that would make the post more version-specific and require ongoing maintenance.
