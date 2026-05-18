# Validation Summary: How to Set Up OpenLDAP Replication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenLDAP (slapd)
- LDAP syncrepl (RFC 4533 Content Synchronization)
- syncprov overlay
- accesslog overlay (delta-sync)
- cn=config (OLC / Dynamic Configuration)
- Ubuntu 22.04
- slappasswd, ldapadd, ldapmodify, ldapsearch CLI tools
- UFW firewall

## Sources Consulted
- OpenLDAP Admin Guide 2.4 — Replication: https://www.openldap.org/doc/admin24/replication.html
- OpenLDAP Admin Guide 2.6 — Replication: https://www.openldap.org/doc/admin26/replication.html
- slapd-config(5) man page: https://manpages.ubuntu.com/manpages/jammy/man5/slapd-config.5.html
- slapo-syncprov(5) man page
- slapo-accesslog(5) man page
- ldapsearch(1) man page: https://man7.org/linux/man-pages/man1/ldapsearch.1.html
- Ubuntu Server documentation — Install OpenLDAP: https://documentation.ubuntu.com/server/how-to/openldap/install-openldap/
- RFC 4533 — LDAP Content Synchronization Operation

## Issues Found

1. **Incorrect `ldapsearch` syntax for `contextCSN` queries** — Both monitoring commands used `-W -s base contextCSN`, where the bare attribute name `contextCSN` would be parsed as the LDAP search filter and rejected as a malformed filter (no parentheses). Fixed by inserting a proper filter `"(objectClass=*)"` before the attribute name on both the provider and consumer commands.

2. **Incomplete delta-sync (accesslog) configuration** — The "Delta-Sync with Accesslog Overlay" section only loaded the module and created the accesslog database, but did not attach the `accesslog` overlay to the main `{1}mdb` database. Without the overlay, no audit log entries are written and delta-sync (`syncdata=accesslog` in `olcSyncRepl`) would not function. Added the missing overlay entry (`olcOverlay=accesslog,olcDatabase={1}mdb,cn=config`) with standard `olcAccessLogDB`, `olcAccessLogOps: writes`, `olcAccessLogSuccess: TRUE`, and `olcAccessLogPurge: 07+00:00 01+00:00` settings per the OpenLDAP Admin Guide.

## Review Notes

- The `{1}mdb` database index is correct for a default Ubuntu 22.04 slapd install. Readers with non-default installs (e.g., monitor database inserted) may need to adjust the index.
- The `syncprov` overlay configuration (`olcSpSessionLog: 100`, `olcSpCheckpoint: 100 10`) is valid. For best results with session log, the main database should also have an `eq` index on `entryUUID` — this is not mentioned in the post but is a minor optimization.
- The "Simpler syncrepl Without Accesslog" example omits `tls_reqcert` for brevity; not an error, just less strict than the first example.
- The `olcUpdateRef` mechanism does require LDAP clients that follow referrals; some clients do not by default. The post correctly notes that "many" clients handle them transparently.
- The accesslog database setup writes to `/var/lib/ldap/accesslog`, which AppArmor on Ubuntu may restrict. Readers may need to adjust the AppArmor profile for slapd if they hit access denials — not strictly an error in the post but a real-world gotcha.
- TLS configuration (`starttls=yes`, `tls_cacert=/etc/ssl/certs/ca-certificates.crt`) assumes the provider already has a valid TLS certificate set up. The post does not cover provisioning that certificate, which is acceptable scope-wise but worth noting as a prerequisite.
