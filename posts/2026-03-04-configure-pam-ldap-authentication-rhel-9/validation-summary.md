# Validation Summary: How to Configure PAM for LDAP Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- PAM
- SSSD
- LDAP / OpenLDAP
- LDAPS and STARTTLS
- authselect
- NSS / nsswitch.conf
- oddjob-mkhomedir

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring SSSD to use LDAP and require TLS authentication - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-sssd-to-use-ldap-and-require-tls-authentication_configuring-authentication-and-authorization-in-rhel
- Red Hat Enterprise Linux 9 documentation: Configuring user authentication using authselect - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Local `sssd-ldap(5)` manual page for LDAP provider options including `ldap_default_authtok_type`, `ldap_tls_reqcert`, `ldap_id_use_start_tls`, and `ldap_access_filter`.
- SSSD upstream quick start LDAP guide - https://sssd.io/docs/quick-start.html
- `sss_obfuscate(8)` manual page for supported obfuscated bind-password handling - https://manpages.org/sss_obfuscate/8

## Issues Found
- The post suggested storing the LDAP bind password in a separate file and referencing it with `ldap_default_authtok = file:///etc/sssd/ldap-bind-pw`. The SSSD LDAP provider documents `ldap_default_authtok_type` values of `password` and `obfuscated_password`; it does not document a `file://` token indirection for `ldap_default_authtok`. I replaced that section with the supported `sss_obfuscate --stdin --domain ldap.example.com` workflow, which sets `ldap_default_authtok_type = obfuscated_password` and writes the obfuscated token into the domain section.

## Review Notes
- The main RHEL 9 SSSD/authselect flow is accurate: Red Hat documents the `sssd` authselect profile, `with-mkhomedir`, SSSD-backed NSS entries, strict `sssd.conf` permissions, and SSSD LDAP TLS settings.
- Obfuscating the bind password avoids plain text in the file but is not equivalent to strong secret storage. The best long-term approach depends on the LDAP environment and may involve stronger authentication mechanisms such as Kerberos, SASL/GSSAPI, or client certificates.
