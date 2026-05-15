# Validation Summary: How to Set Up Postfix with LDAP Directory Lookups on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- Postfix LDAP lookup tables
- LDAP, LDAPS, and STARTTLS
- Active Directory LDAP attributes
- SELinux troubleshooting

## Sources Consulted
- Postfix ldap_table(5): https://www.postfix.org/ldap_table.5.html
- Postfix LDAP_README: https://www.postfix.org/LDAP_README.html
- Postfix virtual(5): https://www.postfix.org/virtual.5.html
- Postfix virtual(8): https://www.postfix.org/virtual.8.html
- Postfix VIRTUAL_README: https://www.postfix.org/VIRTUAL_README.html
- Postfix postconf(5): https://www.postfix.org/postconf.5.html
- Postfix postmap(1): https://www.postfix.org/postmap.1.html
- Red Hat Enterprise Linux 9, Deploying mail servers, "Using an LDAP directory as a lookup table": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/deploying_mail_servers/index

## Issues Found
- The virtual alias section said aliases map email addresses to mailbox locations. Postfix `virtual_alias_maps` maps recipient addresses to other addresses, so the wording was corrected.
- The sample LDAP entry lacked `mailMessageStore`, but the virtual mailbox map queried that attribute. Added `mailMessageStore: example.com/jdoe` so the example lookup can return a mailbox path.
- The virtual mailbox `main.cf` example did not declare a virtual mailbox domain, mailbox base, or ownership maps. Added `virtual_mailbox_domains = example.com`, `virtual_mailbox_base = /var/mail/vhosts`, `virtual_minimum_uid`, `virtual_uid_maps`, and `virtual_gid_maps` so the LDAP mailbox map is used as intended without relying on domain lookups that the shown LDAP filter would not satisfy.
- The recipient validation section implied that `local_recipient_maps` validates all LDAP recipients. Postfix uses it for local recipient addresses in domains listed in `mydestination`, so the section title, intro, and comments were narrowed.
- The LDAPS and STARTTLS examples omitted `version = 3`, which Postfix documents as required for LDAP SSL and STARTTLS. Added it to both snippets.
- The troubleshooting section recommended LDAP connection caching, but Postfix documents LDAP cache settings as ignored because OpenLDAP cache support was removed. Replaced that guidance with indexing, local replication, and reducing unnecessary lookups.

## Review Notes
The guide remains intentionally generic. A production virtual mailbox deployment should use UID and GID values that exist on the host and match the intended mailbox owner, or use a delivery stack such as Dovecot LMTP where those Postfix `virtual(8)` ownership maps are not the final authority.
