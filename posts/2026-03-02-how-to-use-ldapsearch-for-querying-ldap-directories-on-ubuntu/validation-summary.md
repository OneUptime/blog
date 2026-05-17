# Validation Summary: How to Use ldapsearch for Querying LDAP Directories on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenLDAP `ldapsearch` client (ldap-utils package on Ubuntu)
- LDAP filter syntax (RFC 4515)
- LDAP search scopes (base / one / sub)
- LDIF output format
- TLS / StartTLS / LDAPS
- SASL authentication (GSSAPI / Kerberos, EXTERNAL)
- OpenLDAP `ldap.conf` client configuration
- OpenLDAP ppolicy overlay attributes
- Active Directory LDAP querying from Linux

## Sources Consulted
- ldapsearch(1) man page (OpenLDAP) — https://www.openldap.org/software/man.cgi?query=ldapsearch
- ldap.conf(5) man page (OpenLDAP) — https://www.openldap.org/software/man.cgi?query=ldap.conf
- RFC 4515 (LDAP String Representation of Search Filters)
- RFC 4511 (LDAP Protocol — attribute selectors `*` and `+`)
- draft-behera-ldap-password-policy-10 (IETF) — https://datatracker.ietf.org/doc/html/draft-behera-ldap-password-policy-10
- slapo-ppolicy(5) — https://man7.org/linux/man-pages/man5/slapo-ppolicy.5.html
- Microsoft Active Directory schema reference (sAMAccountName, objectClass=user)

## Issues Found

1. **Incorrect ppolicy attribute name `pwdAccountLocked`** (used in two places).
   The OpenLDAP password policy overlay does not define an attribute called `pwdAccountLocked`. The correct attribute per draft-behera-ldap-password-policy is `pwdAccountLockedTime`, which holds a GeneralizedTime timestamp (not a boolean) of when the account was locked. A presence filter `(pwdAccountLockedTime=*)` identifies locked accounts.
   - Fixed the nested compound filter example from `(!(pwdAccountLocked=TRUE))` to `(!(pwdAccountLockedTime=*))`.
   - Fixed the "Check if an Account is Locked" example's attribute list from `pwdAccountLocked` to `pwdAccountLockedTime`.

## Review Notes
- The NOT-filter example `(&(objectClass=posixAccount)(!(ou=ServiceAccounts)))` is syntactically valid as a demonstration of NOT, but semantically weak: `ou` on a posixAccount entry typically does not store the parent OU (that lives in the DN). The right way to exclude entries under a sub-OU is usually to narrow the base DN. Left as-is because the goal of the snippet is to illustrate NOT syntax.
- The AD filter `(objectClass=user)` will also match computer accounts (since computers inherit from `user`). For user-only results, `(&(objectCategory=person)(objectClass=user))` is more precise. Not changed because the post's example is still valid LDAP and works against AD; it is just broader than a strict "users only" query.
- `BINDDN` in `ldap.conf` is a valid directive per OpenLDAP `ldap.conf(5)`, but it only sets a default bind DN — the password still has to be supplied per command (e.g., via `-W`/`-w`/`-y`). Worth mentioning to readers in a future revision but not technically wrong.
- All other flags, filter operators (`=`, `>=`, `<=`, substring `*`, `&`, `|`, `!`), attribute selectors (`*` and `+`), TLS options (`-Z`, `ldaps://`), SASL options (`-Y GSSAPI`, `-Y EXTERNAL`, `-H ldapi:///`), and `ldap.conf` directives (`BASE`, `URI`, `TLS_REQCERT`, `TLS_CACERT`) verified correct.
