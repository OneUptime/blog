# Validation Summary: How to Set Up Sudo Access Control with LDAP on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- sudo
- LDAP and OpenLDAP
- SSSD
- NSS/nsswitch.conf
- sudoers LDAP schema

## Sources Consulted
- Sudo sudoers.ldap manual: https://www.sudo.ws/docs/man/sudoers.ldap.man/
- Sudo README.LDAP: https://www.sudo.ws/docs/readme/readme_ldap/
- Red Hat SSSD service configuration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system-level_authentication_guide/configuring_services
- SSSD sudo troubleshooting documentation: https://docs.pagure.org/sssd.sssd/users/sudo_troubleshooting.html
- Local `sssd-sudo(5)`, `sssd-ldap(5)`, `sssd.conf(5)`, and `sudo(8)` man pages

## Issues Found
- The OpenLDAP schema example hand-wrote an incomplete OLC schema and used the older `sudoRunAs` attribute. Replaced it with loading the packaged `schema.olcSudo` file, which is the sudo-provided schema for OpenLDAP servers using `cn=config`.
- The LDAP sudoRole examples used the obsolete `sudoRunAs` attribute. Updated them to `sudoRunAsUser` and `sudoRunAsGroup`, matching current sudo LDAP schema documentation.
- The sudoRole entries omitted `objectClass: top`. Added it to align the examples with the sudo documentation's LDAP examples.
- The SSSD example omitted `config_file_version = 2` and the `[sudo]` section shown in Red Hat's SSSD sudo configuration flow. Added both.
- The nsswitch command appended a `sudoers:` line unconditionally, which can leave duplicate database entries. Changed it to replace an existing `sudoers:` line or append one only if missing.
- The troubleshooting comment only mentioned the domain section for debug logging. Updated it to mention both the `[sudo]` responder section and the domain section.

## Review Notes
- The post now validates as a technical tutorial. Future improvements could note that RHEL environments commonly use IdM/FreeIPA or Active Directory for centralized identity and policy, and that direct OpenLDAP server deployment details vary by distribution and LDAP server packaging.
