# Validation Summary: How to Integrate Kerberos with LDAP on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ubuntu 22.04
- MIT Kerberos (krb5-kdc, krb5-kdc-ldap)
- OpenLDAP (slapd) with cn=config / mdb backend
- `kdb5_ldap_util`, `kadmin.local`, `slappasswd`, `slaptest`
- LDIF / OLC ACLs
- SSSD (id_provider=ldap, auth_provider=krb5)

## Sources Consulted
- MIT Kerberos Documentation — Configuring Kerberos with OpenLDAP back-end: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_ldap.html
- MIT Kerberos `kdb5_ldap_util` reference: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kdb5_ldap_util.html
- MIT Kerberos `kdc.conf` reference: https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/kdc_conf.html
- MIT Kerberos LDAP schema (kerberos.schema / kerberos.ldif) shipped with `krb5-kdc-ldap`
- OpenLDAP Administrator's Guide — schema loading via slaptest and OLC: https://www.openldap.org/doc/admin24/
- Ubuntu Server documentation — Kerberos and LDAP: https://documentation.ubuntu.com/server/how-to/openldap/

## Issues Found

1. **Incorrect Kerberos attribute names in "How the Integration Works"** — The post referenced `krb5Principal` and `krb5EncryptionType`. The MIT Kerberos LDAP schema uses the `krb` prefix (e.g. `krbPrincipalName`, `krbPrincipalKey`); the `krb5*` names belong to the older Sun/Heimdal-style schema and are inconsistent with the rest of the post, which correctly uses `krbPrincipalName` and `krbPrincipalAux`. Updated to `krbPrincipalName`, `krbPrincipalKey`.

2. **Conflicting `ldap_kdc_sasl_mech = EXTERNAL` in `kdc.conf`** — SASL EXTERNAL requires either `ldapi://` with peer credentials or LDAP over TLS with a client cert. Because the surrounding configuration uses `ldap://localhost` plus a simple bind via `ldap_kdc_dn` + `ldap_service_password_file`, declaring `ldap_kdc_sasl_mech = EXTERNAL` would either be ignored or cause auth conflicts. Removed the line.

3. **Misleading "# TLS settings" comment** — The comment was placed above `ldap_conns_per_server = 5`, which is a connection pool size setting (not TLS). Changed the comment to "# Connection pooling".

4. **Invalid `-P` flag in `kdb5_ldap_util create`** — The MIT `kdb5_ldap_util create` accepts `-P password` to supply the master key inline; using `-P` with no argument is incorrect. Since the surrounding prose says "set the KDC master key" interactively, removed the `-P` so `-s` alone is used (which prompts for the master password and creates a stash).

## Review Notes
- The `slaptest` + `sed` approach for converting `kerberos.schema` to a cn=config-compatible LDIF and stripping operational attributes is a well-established workaround on Ubuntu/Debian. Some recent `krb5-kdc-ldap` packages ship a ready-made `kerberos.openldap.ldif`; readers on newer Ubuntu releases may be able to skip the conversion step.
- `kdc_listen` / `kdc_tcp_listen` (used in the `[kdcdefaults]` section) are valid in MIT krb5 1.15+. Older guides often show `kdc_ports` / `kdc_tcp_ports`; both forms are accepted by current MIT Kerberos but only the new forms are documented going forward.
- The example uses `ldap://localhost` for the KDC→LDAP connection. For production, switching to `ldapi:///` (Unix socket) or `ldaps://` with verified TLS is strongly recommended so the simple-bind credential is never sent in cleartext; the post hints at this implicitly but doesn't enforce it.
- The `objectClass: krbPrincipalAux` modification in Step 8 is correct, but in practice you'll usually also want the principal entry to satisfy `krbPrincipal` requirements (krbPrincipalName is provided here, which is sufficient as the MUST attribute on `krbPrincipalAux`).
- The final `kadmin.local addprinc jsmith` will create the principal under the LDAP backend (since the KDC has been pointed at LDAP), and the key material will land on the same entry that already has `krbPrincipalName` from the ldif modify — this is the intended unified-entry result the post describes.
