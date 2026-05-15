# Validation Summary: How to Install and Configure OpenLDAP on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- OpenLDAP client tools
- SSSD
- systemd
- authselect

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring authentication and authorization in RHEL, OpenLDAP client configuration procedure: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 9 Package Manifest, OpenLDAP packages available in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Red Hat Customer Portal solution, `openldap-servers` removal in RHEL 8/9: https://access.redhat.com/solutions/3816971

## Issues Found
- The original package installation command used `<package-name>`, which is not actionable. Replaced it with the RHEL 9 OpenLDAP client packages from Red Hat documentation: `openldap-clients sssd sssd-ldap oddjob-mkhomedir`.
- The original guide implied that an OpenLDAP service could be installed and started on RHEL 9, but RHEL 9 does not provide `openldap-servers`. Updated the guide to describe supported OpenLDAP client configuration and added a note to use Red Hat Directory Server or Red Hat Identity Management when hosting a directory service on RHEL 9.
- The original configuration path `/etc/<service>/config.conf` and service name `<service-name>` were placeholders. Replaced them with `/etc/openldap/ldap.conf`, `/etc/sssd/sssd.conf`, and the `sssd` and `oddjobd` services.
- The original verification and troubleshooting commands used placeholders. Replaced them with `systemctl status sssd oddjobd`, `id <ldap_user>`, `journalctl -u sssd`, and `rpm -q` checks for the required packages.

## Review Notes
The guide now covers configuring a RHEL 9 system as an LDAP client. It does not cover installing an OpenLDAP server on RHEL 9 because that server package is not available in RHEL 9.
