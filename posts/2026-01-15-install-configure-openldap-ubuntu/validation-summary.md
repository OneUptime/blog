# Validation Summary: How to Install and Configure OpenLDAP on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step OpenLDAP installation and configuration on Ubuntu)

## Technologies Covered
- OpenLDAP (slapd) and the cn=config (OLC) runtime configuration backend
- ldap-utils client tools (ldapsearch, ldapadd, ldapmodify, ldapdelete, ldapwhoami, slapcat, slapadd, slappasswd)
- LDIF (LDAP Data Interchange Format)
- MDB (LMDB) database backend
- TLS/SSL and StartTLS (OpenSSL certificate generation)
- LDAP ACLs (olcAccess syntax)
- nslcd / libnss-ldapd / libpam-ldapd, NSS and PAM integration
- phpLDAPadmin web interface (Apache)
- syncprov replication overlay
- Ubuntu/Debian tooling: dpkg-reconfigure, pam-auth-update, systemd, ufw, cron

## Sources Consulted
- OpenLDAP Software 2.x Administrator's Guide — https://www.openldap.org/doc/admin24/ and 2.5/2.6 editions (slapd-config, ACLs, slapcat/slapadd, syncprov overlay, indexing)
- man pages: ldapsearch(1), ldapadd(1), ldapmodify(1), ldapdelete(1), ldapwhoami(1), slapcat(8), slapadd(8), slappasswd(8), slapd-config(5), slapd-mdb(5)
- Ubuntu Server documentation — OpenLDAP / LDAP server and client setup (https://ubuntu.com/server/docs)
- nss-pam-ldapd / nslcd.conf(5) documentation (Arthur de Jong) for nslcd mapping and pam_authz_search
- RFC 4510/4511/4512/4513 (LDAP protocol, schema, naming) and RFC 2849 (LDIF)
- Debian pam-auth-update / pam.d common-* templates

## Issues Found
- **`db_recover` recommended for an MDB database (Database corruption troubleshooting).** The guide standardizes on the MDB (LMDB) backend throughout, but the corruption-recovery step suggested `sudo db_recover -h /var/lib/ldap`. `db_recover` is a Berkeley DB (back-bdb/back-hdb) utility and does not apply to MDB — LMDB is crash-resistant and has no equivalent recovery tool; recovery is done by rebuilding from backup. Replaced the `db_recover` line with a comment clarifying that the MDB backend has no separate recovery tool and that the correct path is to rebuild from backup (the surrounding `slapcat` integrity check and `slapadd` rebuild steps were already correct and were left intact).

## Review Notes
- The example password hash is described as an SSHA hash (`{SSHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=`), but that specific value is an unsalted SHA-1 of "password" (28 base64 chars = 20-byte digest, no salt); a real `{SSHA}` value is longer because it appends a salt. This is purely an illustrative placeholder showing the format and does not affect any command, so it was left unchanged. Readers should always generate their own hash with `slappasswd`.
- On Ubuntu 22.04+ (OpenLDAP 2.5+), the Berkeley DB backends were removed and MDB is the only available backend, so the "Database backend: Select MDB" `dpkg-reconfigure` prompt may not appear (or offers only MDB). The instruction remains correct in spirit.
- `pam_authz_search` with `memberOf` filters requires the `memberof` overlay (or `dynlist`) to be configured on the server, otherwise `memberOf` is not populated. The syntax shown is correct; this is a server-side prerequisite worth noting.
- `netstat` (line in connection troubleshooting) requires `net-tools`, which is not installed by default on modern Ubuntu; `ss -tlnp` is the modern equivalent. Not incorrect, just a minor portability note.
- The self-signed TLS setup correctly reuses the server cert as its own CA (`olcTLSCACertificateFile`), which is valid for self-signed testing scenarios.
- All ldapsearch/ldapadd/ldapmodify/ldapdelete invocations, flags, LDIF changetype operations (modify/add/delete/modrdn), ACL `olcAccess` syntax, slapcat/slapadd numbering (`-n 0` config, `-n 1` data), and the syncprov replication overlay LDIF are accurate and current.
