# Validation Summary: How to Configure SSSD with Multiple Identity Providers on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- SSSD
- LDAP / OpenLDAP
- Active Directory
- Kerberos
- NSS and PAM
- sudoers

## Sources Consulted
- Ubuntu manpage for `sssd.conf`: https://manpages.ubuntu.com/manpages/noble/man5/sssd.conf.5.html
- Ubuntu manpage for `sssd-ldap`: https://manpages.ubuntu.com/manpages/noble/man5/sssd-ldap.5.html
- Ubuntu manpage for `sssd-ad`: https://manpages.ubuntu.com/manpages/noble/man5/sssd-ad.5.html
- Ubuntu manpage for `sssd-krb5`: https://manpages.ubuntu.com/manpages/noble/man5/sssd-krb5.5.html
- Ubuntu manpage for `sssd-simple`: https://manpages.ubuntu.com/manpages/noble/man5/sssd-simple.5.html
- Ubuntu manpage for `sssctl`: https://manpages.ubuntu.com/manpages/noble/man8/sssctl.8.html
- Ubuntu manpage for `sudoers`: https://manpages.ubuntu.com/manpages/noble/man5/sudoers.5.html

## Issues Found
- The OpenLDAP examples used `ldap_idmap_range_min` and `ldap_idmap_range_max` as if they constrained POSIX LDAP `uidNumber`/`gidNumber` values. Those options are for LDAP/AD ID mapping from SID values, so the OpenLDAP and LDAP-plus-Kerberos examples were changed to use `min_id` and `max_id`.
- The AD example specified an ID mapping range without explicitly enabling SID-based mapping and used a maximum/range combination that did not match the described range. The example now explicitly sets `ldap_id_mapping = true` and uses a consistent `ldap_idmap_range_min`, `ldap_idmap_range_max`, and `ldap_idmap_range_size`.
- The verification commands used `getent passwd` enumeration to list domain users, but enumeration is disabled by default and the article later recommends keeping it disabled. The example was changed to check expected UID ranges for named users with `id -u`.
- The monitoring section used `sssctl user-list`, which is not a documented `sssctl` subcommand in the Ubuntu manpage. It was replaced with documented `sssctl user-show` examples for specific cached users.
- The UID conflict guidance told readers to adjust `ldap_idmap_range_*` for every domain. This was corrected to distinguish POSIX LDAP domains, where directory UID/GID values or `min_id`/`max_id` filters apply, from AD domains using SID-based ID mapping.
- The example scenario referred to "Local files" as if they were an SSSD identity provider in the shown configuration. It now identifies them as local NSS files outside SSSD.

## Review Notes
The configuration remains an illustrative example. Real deployments should also verify DNS, Kerberos realm discovery, CA trust, `nsswitch.conf`, PAM integration, and the actual AD RID range before choosing final ID mapping ranges.
