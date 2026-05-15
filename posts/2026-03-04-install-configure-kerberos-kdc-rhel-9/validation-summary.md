# Validation Summary: How to Install and Configure a Kerberos KDC on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- MIT Kerberos KDC
- krb5-server, krb5-workstation, kadmin, kadmin.local, kdb5_util
- Kerberos realm and KDC configuration
- firewalld
- systemd services

## Sources Consulted
- MIT Kerberos kdc.conf documentation: https://www.mit.edu/~kerberos/krb5-current/doc/admin/conf_files/kdc_conf.html
- MIT Kerberos kadmin and kadmin.local documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- MIT Kerberos database administration documentation: https://web.mit.edu/kerberos/krb5-current/doc/admin/database.html
- MIT Kerberos kdb5_util documentation: https://web.mit.edu/kerberOS/krb5-1.19/doc/admin/admin_commands/kdb5_util.html
- MIT Kerberos krb5.conf documentation: https://web.mit.edu/Kerberos/www/krb5-1.22/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos encryption types documentation: https://web-cert.mit.edu/kerberos/krb5-1.21/doc/admin/enctypes.html
- MIT Kerberos kadm5.acl documentation: https://web.mit.edu/Kerberos/krb5-1.11/doc/admin/conf_files/kadm5_acl.html
- Red Hat Enterprise Linux 9 Identity Management services documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/accessing_identity_management_services/index
- firewalld service documentation: https://firewalld.org/documentation/service/
- firewalld command documentation: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The KDC configuration used `kdc_ports` and `kdc_tcp_ports`. MIT Kerberos 1.15 and later document these as deprecated compatibility names, with `kdc_listen` and `kdc_tcp_listen` as the current options. Updated the example to use the current listener options.
- The firewall commands opened Kerberos port 88 and the kadmind admin port 749, but omitted the default kpasswd password-change port 464. MIT Kerberos documents kadmind as listening for password change requests on port 464 by default. Added `464/tcp` and `464/udp` to the firewalld commands.

## Review Notes
- The local review environment did not have the Kerberos server administration binaries installed, so command behavior was checked against official MIT Kerberos and Red Hat documentation rather than local `--help` output.
- The guide is for a standalone MIT Kerberos KDC. Red Hat generally recommends FreeIPA/IdM for production identity management, which the post already notes.
