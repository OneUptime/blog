# Validation Summary: How to Handle Samba and FreeIPA Compatibility in FIPS Mode on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- FIPS mode and system-wide cryptographic policies
- Samba
- SMB/CIFS
- Kerberos
- NTLM
- FreeIPA / Red Hat Identity Management
- Active Directory trusts

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Running Samba on a server with FIPS mode enabled": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation, "Installing trust between IdM and AD": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_trust_between_idm_and_ad/index
- Red Hat Enterprise Linux 9 documentation, "Installing Identity Management", FIPS compliance section: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/installing_identity_management
- Red Hat Enterprise Linux 9 documentation, "Security hardening", FIPS and system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/index
- Samba smb.conf manual page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba net manual page: https://www.samba.org/samba/docs/current/man-html/net.8.html
- Samba smbclient manual page: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Linux kernel CIFS client documentation: https://www.kernel.org/doc/html/v6.6/admin-guide/cifs/usage.html
- FreeIPA config_mod API reference: https://freeipa.readthedocs.io/en/latest/api/config_mod.html

## Issues Found
- The opening explanation attributed all Samba and FreeIPA FIPS issues to MD4 and MD5. Updated it to include RC4-related compatibility paths and weak AD encryption types, matching Red Hat's Samba and IdM FIPS guidance.
- The Samba limitations list omitted unsupported standalone file-server mode and NT4-style domain modes in FIPS mode. Added those limitations from Red Hat's RHEL 9 Samba documentation.
- The Samba `kerberos encryption types` example used a list of MIT Kerberos enctype names. Samba's documented values for this option are policy values such as `all`, `strong`, and `legacy`; changed it to `strong`.
- The Kerberos `permitted_enctypes` example forced AES HMAC-SHA1 enctypes in a RHEL FIPS context. Removed the override and noted that RHEL system-wide crypto policies should control permitted enctypes.
- The `testparm` example was changed to `testparm -s`, matching Red Hat's FIPS-mode Samba verification procedure.
- The `net ads join -k` and `smbclient -k` examples used deprecated Kerberos CLI syntax. Replaced them with `--use-kerberos=required`, which is documented in current Samba man pages.
- The FreeIPA AD trust section understated FIPS limitations. Updated it to reflect Red Hat guidance that shared-secret trust establishment is not supported in FIPS mode, two-way cross-forest trust establishment can fail due to NTLMSSP, and IdM/AD integration can fail when AD only offers RC4 or AES HMAC-SHA1 while RHEL 9 FIPS defaults to AES HMAC-SHA2.
- Removed the `ipa config-mod --ipaconfigstring='KDC:enctypes=...'` example because `ipaconfigstring` only accepts defined FreeIPA feature flags, not arbitrary Kerberos enctype configuration.

## Review Notes
The corrected post is accurate as a practical high-level guide, but real RHEL/FIPS deployments are version- and policy-sensitive. Administrators should confirm their exact RHEL minor release, crypto policy, AD encryption-type support, and Red Hat support requirements before changing production authentication paths.
