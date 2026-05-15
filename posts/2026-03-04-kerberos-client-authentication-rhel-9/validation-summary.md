# Validation Summary: How to Set Up Kerberos Client Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- MIT Kerberos
- Kerberos client tools (`kinit`, `klist`, `kdestroy`, `kvno`)
- `/etc/krb5.conf`
- Kerberos keytabs
- SSSD and PAM integration
- KCM credential caches
- DNS SRV records for Kerberos service discovery

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring authentication and authorization in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Red Hat Enterprise Linux 9 release notes, deprecated functionality for SSSD files provider and PAM modules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/deprecated-functionalities
- MIT Kerberos `krb5.conf` documentation: https://web.mit.edu/kerberos/www/krb5-1.20/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos `kinit` documentation: https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_commands/kinit.html
- MIT Kerberos `klist` documentation: https://web.mit.edu/kerberos/krb5-1.17/doc/user/user_commands/klist.html
- MIT Kerberos `kdestroy` documentation: https://web.mit.edu/kerberos/www/krb5-latest/doc/user/user_commands/kdestroy.html
- MIT Kerberos `kvno` documentation: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kvno.html
- MIT Kerberos `kadmin.local` documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- Local `sssd-krb5(5)` and `sssd.conf(5)` man pages

## Issues Found
- The SSSD installation command only installed `sssd`. I changed it to install both `sssd` and `sssd-krb5` because the example uses the SSSD Kerberos authentication provider.
- The SSSD example did not explain that `auth_provider = krb5` must be paired with an identity provider. I added a short clarification that the example uses local file identities and that LDAP, FreeIPA, or Active Directory deployments should use the matching SSSD identity provider.
- The post suggested installing `pam_krb5` as a direct PAM/Kerberos alternative. I replaced that with current RHEL 9 guidance explaining that `pam_krb5` is deprecated and SSSD with `pam_sss` should be used.

## Review Notes
The remaining Kerberos commands, keytab commands, KCM socket enablement, and `krb5.conf` options are consistent with MIT Kerberos and RHEL documentation. The `id_provider = files` example is supported in RHEL 9 but deprecated for future RHEL releases, so a production deployment should prefer an identity provider such as LDAP, FreeIPA, or Active Directory where applicable.
