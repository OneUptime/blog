# Validation Summary: How to Troubleshoot LDAP Search and Bind Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenLDAP (slapd, cn=config / OLC)
- LDAP protocol (bind, search, result codes per RFC 4511)
- ldap-utils (ldapsearch, ldapwhoami, ldapmodify, slappasswd)
- TLS / StartTLS / LDAPS (openssl s_client)
- SSSD (sssd.conf, sss_cache, sssd logs)
- Ubuntu system tools (journalctl, update-ca-certificates, nc)

## Sources Consulted
- OpenLDAP Admin Guide — slapd-config: https://www.openldap.org/doc/admin26/slapdconf2.html
- slapd.conf(5) man page: https://www.openldap.org/software/man.cgi?query=slapd.conf&sektion=5
- ldapsearch(1) man page: https://www.openldap.org/software/man.cgi?query=ldapsearch&sektion=1
- RFC 4511 (LDAP: The Protocol) — result codes
- ldap.conf(5) for TLS_REQCERT semantics
- SSSD documentation (sssd.conf(5))

## Issues Found
1. **Incorrect slapd log levels table.** The post mapped level 64 to "filter" and level 128 to "config", and was missing level 32 entirely. Per the OpenLDAP slapd.conf(5) man page and admin guide, the correct mapping is:
   - 32 (0x20) = `filter` — search filter processing
   - 64 (0x40) = `config` — configuration file processing
   - 128 (0x80) = `ACL` — access control list processing

   I fixed the table to include all three levels with their correct names and descriptions, and also corrected the combine-levels example from `olcLogLevel: 256 64` ("stats plus filter processing") to `olcLogLevel: 256 32`, since 64 is config, not filter. Also tightened the description of level 32768 to match the man page wording ("Only messages logged regardless of log level" rather than "Only emergency messages").

## Review Notes
- LDAP result codes table (0, 1, 4, 32, 34, 49, 50, 51, 52) all verified against RFC 4511.
- All `ldapsearch` / `ldapwhoami` / `ldapmodify` flag usage is correct: `-x` (simple auth), `-H` (URI), `-D` (bind DN), `-W` / `-w` (prompt / inline password), `-b` (base), `-s base` (scope), `-Y EXTERNAL -H ldapi:///` (SASL EXTERNAL over Unix socket), `-o TLS_REQCERT=never` (libldap option override), `-z` (size limit).
- `ldapsearch -z 0` is documented in the man page as "no limit" from the client side, but the server may still enforce its own `sizelimit` (default 500) unless raised or unless bound as rootdn. The post correctly follows up with the server-side limit raise, so the framing is fine.
- The `olcDatabase={1}mdb,cn=config` DN assumes the default mdb backend index on Ubuntu's slapd package, which has been the default since Ubuntu 16.04. Still accurate for current Ubuntu releases.
- SSSD log path `/var/log/sssd/sssd_<domain>.log` and `sss_cache -E` invocation are correct.
- `pwdAccountLocked` is part of the OpenLDAP password policy overlay (ppolicy) and is referenced correctly as a place to check for locked accounts.
- The openssl `-starttls ldap` argument is supported by OpenSSL 1.1.0+ which has been standard on supported Ubuntu releases for years.
