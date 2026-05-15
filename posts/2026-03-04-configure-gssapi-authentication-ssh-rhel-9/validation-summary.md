# Validation Summary: How to Configure GSSAPI Authentication for SSH on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server and client configuration
- GSSAPI authentication
- Kerberos / MIT Kerberos
- Active Directory domain enrollment with adcli
- Red Hat IdM / FreeIPA client enrollment
- DNS and time synchronization for Kerberos

## Sources Consulted
- MIT Kerberos documentation: Application servers and keytabs, https://web.mit.edu/KERBEROS/krb5-1.15/doc/admin/appl_servers.html
- MIT Kerberos documentation: krb5.conf, https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos documentation: Troubleshooting and KRB5_TRACE, https://web.mit.edu/kerberos/krb5-latest/doc/admin/troubleshoot.html
- Red Hat Enterprise Linux 9 documentation: Configuring authentication and authorization in RHEL, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/index
- Local RHEL-compatible OpenSSH manual pages: sshd_config(5), ssh_config(5)

## Issues Found
- The Kerberos flow diagram incorrectly showed the SSH server contacting the KDC to validate the service ticket. I changed it to show local validation using the server's host keytab, which matches Kerberos application server behavior.
- The prerequisites and DNS troubleshooting stated that forward and reverse DNS must always work and match. I softened this to consistent hostname resolution and noted that reverse DNS matters when DNS canonicalization is used.
- The MIT Kerberos keytab example extracted the host principal into `/etc/krb5.keytab` on the KDC and copied that file to the SSH server. I changed it to extract a per-host temporary keytab before copying it to avoid overwriting the target keytab with unrelated KDC keytab contents.
- The `GSSAPIKeyExchange` comment described the setting as generically stronger security. I changed it to the more precise behavior: host identity can be verified with Kerberos.
- The `GSSAPIStoreCredentialsOnRekey` comment implied normal credential storage. I changed it to state that it updates delegated credentials after a compatible GSSAPI rekey.

## Review Notes
The remaining commands and configuration snippets are technically plausible for RHEL-family OpenSSH with GSSAPI support. In production, administrators should prefer joining systems with IdM, realmd, or adcli workflows where appropriate instead of manually distributing keytabs.
