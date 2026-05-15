# Validation Summary: How to Integrate RHEL with Active Directory Using Kerberos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- MIT Kerberos
- Microsoft Active Directory
- DNS SRV records
- adcli
- msktutil
- OpenSSH GSSAPI authentication
- Apache HTTP Server with mod_auth_gssapi

## Sources Consulted
- MIT Kerberos krb5.conf documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- Red Hat Enterprise Linux 9 authentication and authorization documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 9 direct AD integration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/integrating_rhel_systems_directly_with_windows_active_directory/connecting-rhel-systems-directly-to-ad-using-sssd_integrating-rhel-systems-directly-with-active-directory
- adcli manual documentation: https://www.freedesktop.org/software/realmd/adcli/adcli.html
- adcli man page reference: https://www.mankier.com/8/adcli
- msktutil man page reference: https://manpages.debian.org/trixie/msktutil/msktutil.1.en.html
- mod_auth_gssapi upstream documentation: https://github.com/gssapi/mod_auth_gssapi
- Local OpenSSH `sshd_config(5)` man page for GSSAPI directives

## Issues Found
- The `adcli add-service` command was not a valid `adcli` subcommand. Changed it to `adcli update --domain=ad.example.com --add-service-principal=HTTP/rhel-server.ad.example.com`, which matches current `adcli` documentation for adding a service principal and keytab entry.
- The SSH section implied that a host keytab and GSSAPI settings alone are enough for AD-backed SSH login. Added a clarification that SSH still needs the AD user to resolve to a local account through SSSD, Winbind, or equivalent local account mapping.
- The keytab rotation section described AD computer account passwords as expiring every 30 days. Changed this to describe normal 30-day client-side machine password rotation and the need to keep standalone keytabs synchronized with AD.

## Review Notes
- The Apache example is technically valid when the keytab contains the HTTP service principal and Apache can read it. For production hardening, a dedicated HTTP keytab containing only the required service principal would reduce exposure compared with copying the full host keytab.
- The Kerberos realm examples follow the common AD convention of using an uppercase realm matching the AD DNS domain.
