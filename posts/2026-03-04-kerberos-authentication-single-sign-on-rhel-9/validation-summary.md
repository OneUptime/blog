# Validation Summary: How to Set Up Kerberos Authentication for Single Sign-On on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kerberos / MIT Kerberos
- Kerberos credential caches
- OpenSSH GSSAPI authentication
- NFS with Kerberos security flavors
- DNS SRV discovery and time synchronization

## Sources Consulted
- MIT Kerberos krb5.conf documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos user command documentation for kinit, klist, and kdestroy: https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_commands/kinit.html, https://web.mit.edu/kerberos/www/krb5-1.17/doc/user/user_commands/klist.html, https://web.mit.edu/kerberos/www/krb5-latest/doc/user/user_commands/kdestroy.html
- MIT Kerberos user configuration and ticket management documentation: https://www.mit.edu/~kerberos/krb5-latest/doc/user/user_config/kerberos.html
- MIT Kerberos application server/keytab documentation: https://web.mit.edu/KERBEROS/krb5-1.15/doc/admin/appl_servers.html
- Red Hat Enterprise Linux 9 documentation, Configuring and using network file services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services
- Red Hat Enterprise Linux 9 documentation, Configuring authentication and authorization in RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel
- OpenSSH sshd_config manual reference for GSSAPIAuthentication and GSSAPICleanupCredentials: https://www.linux.org/docs/man5/sshd_config.html

## Issues Found
- The SSH section enabled GSSAPI settings but did not mention that the SSH server needs the matching `host/<fqdn>` service principal in `/etc/krb5.keytab`. Added a `klist -k` verification command so the SSO test does not imply that configuration toggles alone are sufficient.
- The NFS server comment said only to create a service keytab. Updated the wording to state that the NFS service principal is created and added to the server keytab, matching the `addprinc` and `ktadd` commands shown.

## Review Notes
- The `krb5.conf` options shown are valid MIT Kerberos-style settings. `default_ccache_name = KCM:` depends on the RHEL SSSD KCM service being available and configured.
- `GSSAPIDelegateCredentials yes` is valid but forwards user credentials to the remote host, so it should be used only for hosts that need delegated tickets and are trusted.
- The NFS `sec=krb5p` example is technically correct: it provides authentication, integrity checking, and traffic encryption. Administrators can also choose `krb5` or `krb5i` when encryption is not required.
