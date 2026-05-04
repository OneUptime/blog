# Validation Summary: How to Configure LDAP Replication over IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenLDAP (slapd)
- LDAP Sync Replication (syncrepl)
- syncprov overlay
- accesslog overlay (delta-syncrepl)
- Mirror Mode (multi-master)
- IPv6 networking
- LDIF (LDAP Data Interchange Format)
- cn=config (OLC dynamic configuration)

## Sources Consulted
- OpenLDAP Admin Guide — slapd-config(5): https://www.openldap.org/doc/admin24/slapdconf2.html
- OpenLDAP Admin Guide — Replication (syncrepl): https://www.openldap.org/doc/admin24/replication.html
- slapd.conf(5) man page (syncrepl directive)
- slapo-syncprov(5) man page
- ldapsearch(1) and ldapmodify(1) man pages
- RFC 4533 — The Lightweight Directory Access Protocol (LDAP) Content Synchronization Operation
- RFC 4516 — LDAP Uniform Resource Locator (URL syntax for IPv6 literal addresses)

## Issues Found
1. **`olcModuleLoad` added under wrong DN.** The provider LDIF added `olcModuleLoad: syncprov` under `dn: cn=config`, but `olcModuleLoad` is an attribute of the `olcModuleList` objectClass, which lives at `cn=module{0},cn=config`. Modifying `cn=config` directly would fail because the entry lacks the required objectClass. Fixed by changing the DN to `cn=module{0},cn=config`.

2. **`interval` directive incompatible with `refreshAndPersist`.** The consumer `olcSyncRepl` used `interval=00:00:05:00` together with `type=refreshAndPersist`. Per the OpenLDAP syncrepl documentation, `interval` is only meaningful for `refreshOnly` mode; in `refreshAndPersist` it is ignored. Removed the `interval` line to avoid misleading readers.

3. **Duplicate `-H` flag in `contextCSN` query.** The verification command `ldapsearch -H ldap://[2001:db8::10]:389 -Y EXTERNAL -H ldapi:///` specified `-H` twice, so only the second (`ldapi:///`) took effect — defeating the stated intent of querying the IPv6 provider, and additionally `-Y EXTERNAL` over `ldap://` would not authenticate as expected. Replaced with a simple-bind `ldapsearch` against the IPv6 URI to mirror the consumer query.

4. **`-Y EXTERNAL` used with `-H ldap://` for accesslog.** SASL EXTERNAL with peer credential mapping requires the LDAPI Unix socket (`ldapi:///`); it does not work over `ldap://[::1]:389` without TLS + client certificate. Changed to `sudo ldapsearch -H ldapi:/// -Y EXTERNAL`.

## Review Notes
- Mirror Mode (and any multi-master setup) also requires setting `olcServerID` to a unique value per server in addition to `olcMirrorMode: TRUE`. The post does not mention this; readers using the snippet verbatim will need to set `olcServerID` for the configuration to function correctly. Left in place to avoid expanding the post scope, but worth highlighting in a follow-up edit.
- The accesslog-based delta-syncrepl in the consumer config (`logbase`, `logfilter`, `syncdata=accesslog`) requires the `accesslog` overlay to be configured on the provider first; the post does not include that prerequisite step.
- The IPv6 URL bracket syntax `ldap://[2001:db8::10]:389` is correct per RFC 4516.
- The `inetOrgPerson` test entry relies on OpenLDAP's automatic SUP class chain handling; this works in modern OpenLDAP releases.
