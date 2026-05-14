# Validation Summary: How to Configure SSH with Kerberos GSSAPI Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- OpenSSH client and server configuration
- Kerberos / GSSAPI authentication
- MIT Kerberos client configuration
- FreeIPA / IdM host keytab retrieval
- SELinux troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systems using the RHEL 9 web console" - Kerberos SSH setup references `GSSAPIAuthentication yes` and restarting `sshd`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_systems_using_the_rhel_9_web_console/managing-systems-using-the-rhel-9-web-console.pdf
- Red Hat Enterprise Linux 7 System-Level Authentication Guide - OpenSSH GSSAPI authentication and credential delegation behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/pdf/system-level_authentication_guide/Red_Hat_Enterprise_Linux-7-System-Level_Authentication_Guide-en-US.pdf
- Local OpenSSH `ssh_config(5)` man page - verified `GSSAPIAuthentication`, `GSSAPIDelegateCredentials`, `GSSAPIKeyExchange`, and `GSSAPITrustDns`.
- Local OpenSSH `sshd_config(5)` man page - verified `GSSAPIAuthentication`, `GSSAPICleanupCredentials`, and `GSSAPIStrictAcceptorCheck`.
- MIT Kerberos `krb5.conf` documentation - verified `rdns`, hostname canonicalization, clock skew, and credential delegation settings: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos "Principal names and DNS" documentation - verified reverse-DNS behavior and `rdns = false`: https://web.mit.edu/kerberos/krb5-1.12/doc/admin/princ_dns.html
- MIT Kerberos `kadmin` documentation - verified `addprinc -randkey` and `ktadd -k` behavior: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- FreeIPA `ipa-getkeytab(1)` documentation - verified `ipa-getkeytab -s`, `-p`, and `-k` usage for host/service keytabs: https://manpages.debian.org/testing/freeipa-client/ipa-getkeytab.1.en.html

## Issues Found
- The prerequisites and troubleshooting sections stated that reverse DNS is universally critical for GSSAPI. MIT Kerberos uses reverse DNS by default when hostname canonicalization is enabled, but clients can disable that behavior with `rdns = false`. Updated the wording to describe the default behavior and the client-side `rdns = false` workaround accurately.
- The verbose-debugging section listed `Accepted GSSAPI key exchange` as the success indicator. That line refers to GSSAPI key exchange, which is separate from GSSAPI user authentication and is not enabled by the post's configuration. Replaced it with the normal OpenSSH user-authentication success line using `gssapi-with-mic`.

## Review Notes
- The OpenSSH option names and values in the server and client configuration snippets are valid.
- The keytab verification and standalone KDC examples are technically valid. In production, administrators should be careful when retrieving or regenerating keytabs because doing so can invalidate other copies for the same principal.
