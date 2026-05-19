# Validation Summary: How to Configure Cross-Realm Kerberos Trust on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- MIT Kerberos
- Kerberos cross-realm authentication
- krb5.conf
- kadmin and kadmin.local
- OpenSSH GSSAPI authentication
- Active Directory realm trusts
- netdom
- ksetup
- pam_krb5
- SSSD

## Sources Consulted
- MIT Kerberos documentation: Database administration, cross-realm authentication - https://www.mit.edu/~kerberos/krb5-latest/doc/admin/database.html#cross-realm-authentication
- MIT Kerberos documentation: krb5.conf, domain_realm, capaths, and auth_to_local - https://web.mit.edu/kerberos/www/krb5-1.20/doc/admin/conf_files/krb5_conf.html
- MIT Kerberos documentation: kadmin and kadmin.local command reference - https://web.mit.edu/kerberos/krb5-1.14/doc/admin/admin_commands/kadmin_local.html
- MIT Kerberos documentation: kvno command reference - https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kvno.html
- Microsoft Learn: netdom trust - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netdom-trust
- Microsoft Learn: ksetup setenctypeattr - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ksetup-setenctypeattr
- Ubuntu manpage: pam_krb5 - https://manpages.ubuntu.com/manpages/jammy/en/man5/pam_krb5.5.html
- Local OpenSSH man pages: sshd_config(5) and ssh_config(5)

## Issues Found
- The MIT cross-realm setup mentioned matching shared passwords but omitted the MIT-documented requirement that key version numbers and encryption types also match. Added `-kvno 1` to the cross-realm `addprinc` examples and updated the explanatory text.
- The client `capaths` example said it applied to clients in either realm but only showed the CORP-to-PARTNER path. Added the PARTNER-to-CORP direct path.
- The SSH service setup created the host principal and keytab but did not enable OpenSSH GSSAPI authentication, which defaults to disabled on the server. Added the minimal `sshd_config` setting and reload command.
- The Active Directory `netdom trust` example separated `/passwordt` into its own command, but Microsoft documents `/passwordt` as valid only with `/add` or `/reset` for realm trusts. Combined trust creation and password setting into one command and corrected the AD-side trust command orientation.
- The `pam_krb5` note referenced `permitted_host_realm`, which is not an Ubuntu `pam_krb5` option. Replaced it with documented authorization mechanisms such as `.k5login` and `search_k5login`.

## Review Notes
- The post is now technically accurate for a general MIT Kerberos cross-realm setup on Ubuntu. Real deployments may still need site-specific SSH authorization, DNS, time synchronization, KDC firewall rules, and AD trust policy choices.
