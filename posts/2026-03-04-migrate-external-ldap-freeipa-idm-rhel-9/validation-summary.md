# Validation Summary: How to Migrate from an External LDAP Server to FreeIPA (IdM) on RHEL

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management / FreeIPA
- LDAP and LDIF-style directory data
- Kerberos password migration
- SSSD client authentication
- OpenLDAP command-line tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Migrating to Identity Management on RHEL 9": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/migrating_to_identity_management_on_rhel_9/index
- FreeIPA API reference for `migrate-ds`: https://freeipa.readthedocs.io/en/ipa-4-11/api/migrate_ds.html
- FreeIPA API reference for `user-find`: https://freeipa.readthedocs.io/en/ipa-4-11/api/user_find.html
- FreeIPA migration overview: https://www.freeipa.org/page/Howto/Migration
- SSSD LDAP provider manual reference: https://www.mankier.com/5/sssd-ldap

## Issues Found
- The custom schema example used `--group-member-attribute`, which is not a valid `ipa migrate-ds` option in the FreeIPA API reference. I replaced the example with the supported `--schema=RFC2307`, `--user-objectclass=posixAccount`, and `--group-objectclass=posixGroup` options.
- The exclusion example passed multiple users as a comma-separated value to `--exclude-users`. The FreeIPA command treats this as a repeatable string option, so I changed the example to repeat `--exclude-users` once per user.
- The password migration section implied that FreeIPA automatically forwards first login to the migration page and that `kinit` with the old LDAP password triggers migration. Red Hat documents two supported password migration paths: the IdM migration web page and enrolled SSSD clients using the password migration sequence. I updated the explanation and kept `kinit` only as a post-migration Kerberos verification step.
- The UID conflict check used `ipa user-find --uid=10001`, but `--uid` searches the login name. I changed it to `--uidnumber=10001` to search the POSIX UID number.

## Review Notes
The post is technically relevant and generally aligned with Red Hat's RHEL 9 IdM migration workflow. Future improvements could mention the Red Hat recommendation to disable the compat plug-in before migration for performance and re-enable it afterward, but the existing `--with-compat` example is valid when the plug-in remains enabled.
