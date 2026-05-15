# Validation Summary: How to Restrict PAM Services to Specific SSSD Domains on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- PAM
- SSSD
- pam_sss
- sssd.conf
- authselect
- sssctl
- pamtester

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Restricting domains for PAM services using SSSD": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel#restricting-domains-for-pam-services-using-sssd
- Local `pam_sss(8)` man page
- Local `sssd.conf(5)` man page
- SSSD upstream design page, "Restricting the domains a PAM service can auth against": https://sssd.io/design-pages/restrict_domains_in_pam.html

## Issues Found
- The post referenced `pam_allowed_auth_domains`, but this is not a valid SSSD `sssd.conf` option. Replaced that section with the documented `[pam]` responder options `pam_trusted_users` and `pam_public_domains`.
- The post showed `pam_trusted_users` and `pam_public_domains` as domain-level options. They are PAM responder options under `[pam]`, so the example was corrected.
- The post implied SSSD has a direct per-service mapping configuration in `sssd.conf`. RHEL documents service-level restriction through the `domains=` argument on `pam_sss.so`, with `[pam]` responder options controlling trusted and public domain access for service users.
- Several PAM snippets placed `domains=` on account, password, and session lines. RHEL documents the restriction as applying to authentication actions, so the examples now place `domains=` on the `auth` line and keep standard `pam_sss.so` account/password/session examples separate.
- The SSH and console examples stacked an additional `pam_sss.so` authentication line after `password-auth`, which could cause duplicate authentication behavior. The examples now show modifying the relevant `pam_sss.so` authentication line and note that authselect-managed systems should use a custom authselect profile.
- The section heading mentioned `pam_sss_gss`, but the post does not configure GSSAPI authentication with `pam_sss_gss.so`. The heading was corrected to refer to `pam_sss` domain restrictions.

## Review Notes
The corrected post is technically valid for the documented RHEL 9 SSSD/PAM domain restriction workflow. Future improvements could include a full authselect custom profile example, but that would be an expansion rather than a correctness fix.
