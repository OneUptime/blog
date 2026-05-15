# Validation Summary: How to Integrate 389 Directory Server with SSSD on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- 389 Directory Server
- SSSD
- LDAP/LDAPS
- authselect
- oddjob-mkhomedir

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Configuring authentication and authorization in RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_authentication_and_authorization_in_rhel/index
- SSSD Quick Start Guide - LDAP provider example - https://sssd.io/docs/quick-start.html
- Local `sssd.conf(5)` manual page
- Local `sssd-ldap(5)` manual page
- Local `sssd-ldap-attributes(5)` manual page

## Issues Found
- The SSSD configuration snippet omitted `config_file_version = 2`, which Red Hat examples and the `sssd.conf(5)` manual identify as the syntax version used by SSSD 0.6.0 and later. Added it to the `[sssd]` section.
- The bind credential example omitted `ldap_default_authtok_type = password`. This defaults to `password`, but Red Hat's LDAP provider example includes it and it makes the intended token type explicit.
- The object class mappings used `inetOrgPerson` and `groupOfNames` without changing the schema to RFC2307bis or explaining the required POSIX attributes. SSSD's LDAP provider defaults to RFC2307, `posixAccount`, and `posixGroup` for Unix logins, so the example was changed to those mappings and `ldap_schema = rfc2307`.
- The troubleshooting section used `sss_debuglevel`, an older helper. Red Hat's current RHEL documentation recommends `sssctl debug-level 6`, so the command was updated.
- The post mentions using `ldapsearch` for independent connectivity testing but did not install the client package. Added `openldap-clients` to the package installation command.

## Review Notes
- The LDAPS example is valid when the LDAP server certificate chains to the configured CA bundle. Sites with a private 389 Directory Server CA may need to install that CA certificate or point `ldap_tls_cacert` at the site-specific CA file.
- If the directory stores group membership with DN-valued `member` attributes instead of RFC2307 `memberUid`, the SSSD domain should use `ldap_schema = rfc2307bis` and matching group object classes.
