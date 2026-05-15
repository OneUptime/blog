# Validation Summary: How to Configure SSSD for IdM Client Authentication on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management / FreeIPA
- SSSD
- PAM and authselect
- Kerberos
- IdM sudo rules
- Linux systemd services

## Sources Consulted
- Red Hat Enterprise Linux 9: Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/installing_identity_management
- Red Hat Enterprise Linux 9: Configuring authentication and authorization in RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel
- Red Hat Enterprise Linux 9: Tuning performance in Identity Management, SSSD performance options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/tuning_performance_in_identity_management/tuning_performance_in_identity_management
- SSSD upstream man page for sssd.conf: https://www.mankier.com/5/sssd.conf
- SSSD upstream man page for sssd-ipa: https://www.mankier.com/5/sssd-ipa
- Local system man pages for sssd.conf and sssd-ldap, where available.

## Issues Found
- The `offline_failed_login_delay` explanation implied a generic failed-login cache duration. SSSD documents this value as the delay, in minutes, after the offline failed-attempt limit is reached. Updated the comments to distinguish the number of allowed attempts from the delay unit.
- The home-directory section repeated configuration that `ipa-client-install --mkhomedir` already handles. Updated the text to clarify that the `authselect enable-feature with-mkhomedir` step applies if the client was not enrolled with `--mkhomedir`.
- The performance tuning example used `ldap_access_filter` as if it would speed up user resolution in an IdM `id_provider = ipa` domain. That option is for LDAP access filtering, not IdM lookup tuning. Replaced it with `ignore_group_members = True`, which Red Hat documents as an SSSD performance tuning option for large IdM/AD environments.

## Review Notes
The remaining commands and snippets are consistent with the referenced RHEL and SSSD documentation. In production, administrators should still prefer IdM HBAC rules for access control and should avoid changing authselect profiles after `ipa-client-install` unless they understand the existing generated profile state.
