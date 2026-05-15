# Validation Summary: How to Set Up Cross-Realm Kerberos Trust on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- MIT Kerberos
- Kerberos cross-realm trust
- Kerberos KDC administration with `kadmin.local`
- Kerberos client configuration in `krb5.conf`

## Sources Consulted
- Red Hat Enterprise Linux documentation: Setting up Cross-Realm Kerberos Trusts: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system-level_authentication_guide/using_trusts
- MIT Kerberos documentation: Database administration, Cross-realm authentication: https://www.mit.edu/~kerberos/krb5-latest/doc/admin/database.html
- MIT Kerberos documentation: `kadmin` / `kadmin.local` command reference: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- MIT Kerberos documentation: `krb5.conf` `[capaths]` configuration: https://web.mit.edu/kerberos/krb5-1.15/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos documentation: `kvno` command reference: https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kvno.html
- MIT Kerberos documentation: Troubleshooting and `KRB5_TRACE`: https://web.mit.edu/kerberos/krb5-latest/doc/admin/troubleshoot.html

## Issues Found
- The post said only the shared passwords must match for cross-realm principals. Updated it to state that the keys, key version numbers (`kvno` values), and encryption types must also match, matching Red Hat and MIT Kerberos guidance.
- The post described `/etc/krb5.conf` updates as client-only. Updated the wording to include servers that accept cross-realm tickets because MIT Kerberos uses `[capaths]` on servers to validate the transited authentication path.
- The troubleshooting section mapped `"Preauthentication failed"` to mismatched cross-realm shared passwords. Replaced this with a more accurate `"Decrypt integrity check failed"` hint for mismatched shared keys, `kvno` values, or encryption types.

## Review Notes
The guide is technically relevant and broadly accurate for MIT Kerberos-style cross-realm trusts on RHEL. The RHEL 9 documentation set emphasizes IdM and Active Directory integration more heavily than manual MIT Kerberos cross-realm setup, so the review used Red Hat's cross-realm Kerberos documentation together with current MIT Kerberos upstream documentation for command and configuration details.
