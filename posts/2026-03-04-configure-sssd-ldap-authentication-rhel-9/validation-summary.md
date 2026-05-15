# Validation Summary: How to Configure SSSD for LDAP Authentication on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SSSD
- LDAP / LDAPv3
- OpenLDAP client tools
- authselect
- PAM and NSS integration
- TLS / LDAPS / StartTLS

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 9 documentation, "Configuring user authentication using authselect": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- SSSD `sssd-ldap(5)` manual page: https://www.mankier.com/5/sssd-ldap
- SSSD `sssd-ldap-attributes(5)` manual page: https://www.mankier.com/5/sssd-ldap-attributes
- SSSD `sssd.conf(5)` manual page: https://www.mankier.com/5/sssd.conf
- SSSD `sssctl(8)` manual page: https://www.mankier.com/8/sssctl
- SSSD `sss_cache(8)` manual page: https://www.mankier.com/8/sss_cache

## Issues Found
- The package installation command omitted `openldap-clients`, but the troubleshooting section uses `ldapsearch`. Red Hat's RHEL LDAP client procedure installs `openldap-clients`, so the package list was updated.
- The sample configuration claimed to "allow all authenticated users" while setting `access_provider = ldap` and `ldap_access_filter = (objectClass=posixAccount)`. SSSD's LDAP access provider grants access only when the configured filter matches; `access_provider = permit` is the correct allow-all setting. The configuration was updated accordingly.
- The 389 Directory Server and OpenLDAP schema examples used DN-valued group membership attributes (`uniqueMember` and `member`) but did not set `ldap_schema = rfc2307bis`. SSSD defaults to `rfc2307`, where group members are listed by username in `memberUid`. Both examples were updated to specify `ldap_schema = rfc2307bis`.

## Review Notes
The remaining SSSD options, TLS settings, authselect command, service commands, cache-clearing command, and debug-level command are consistent with RHEL 9 documentation and SSSD manual pages. Real deployments should still adapt object classes, bind DN permissions, CA trust paths, and password-change behavior to the LDAP server's local schema and ACLs.
