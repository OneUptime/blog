# Validation Summary: How to Configure Access Control in OpenLDAP on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenLDAP
- LDAP access control lists (ACLs)
- LDIF
- ldapsearch
- ldapmodify
- slapacl

## Sources Consulted
- OpenLDAP Software 2.6 Administrator's Guide: Access Control: https://www.openldap.org/doc/admin26/access-control.html
- OpenLDAP ldapsearch(1) local man page, OpenLDAP 2.6.7 on Ubuntu
- OpenLDAP ldapmodify(1) local man page, OpenLDAP 2.6.7 on Ubuntu
- Symas Knowledge Base: Using slapacl: https://kb.symas.com/reference/using-slapacl

## Issues Found
- The access-level list incorrectly included `add` and `delete` as named OpenLDAP ACL levels. OpenLDAP's documented levels are `none`, `disclose`, `auth`, `compare`, `search`, `read`, `write`, and `manage`; add/delete operations are controlled through `write` access to the `entry` and parent `children` pseudo-attributes. Removed `add` and `delete` from the level list and added the correct explanation.
- The ACL evaluation description said OpenLDAP stops at the first matching rule without distinguishing the matching `to` rule from the matching `by` clause or the effect of ACL controls. Updated the wording to match OpenLDAP's documented evaluation order while preserving the original explanation.
- The "Adding a Single ACL" example used `by dn.subtree="cn=SecurityTeam,ou=Groups,dc=example,dc=com" read`, which matches requester DNs under that DN rather than members of the group. Changed it to `by group.exact="cn=SecurityTeam,ou=Groups,dc=example,dc=com" read`.
- The DN-pattern ACL used `dn.regex` replacement in a way that did not clearly match entries under the department OU and did not use the documented `expand` style for rebuilding the requester DN from target-DN captures. Updated the target regex and changed the requester selector to `dn.exact,expand`.

## Review Notes
The commands and LDIF structure are generally accurate for OpenLDAP 2.6 on Ubuntu. `olcDatabase={1}mdb,cn=config` is common on Ubuntu examples, but database indexes can vary by installation, so readers should confirm the database DN on their own system before applying changes.
