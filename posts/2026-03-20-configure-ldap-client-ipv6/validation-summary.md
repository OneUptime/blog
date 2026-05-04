# Validation Summary: How to Configure LDAP Client Connections over IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- LDAP / OpenLDAP client (ldap-utils, ldapsearch)
- ldap.conf (`/etc/ldap/ldap.conf`, `/etc/openldap/ldap.conf`)
- SSSD (System Security Services Daemon) — sssd.conf, sssd-ldap provider
- nslcd (Name Service LDAP Connection Daemon)
- PAM (`pam_sss.so`, `pam_unix.so`, `pam_succeed_if.so`, `pam_env.so`, `pam_deny.so`)
- NSS (`/etc/nsswitch.conf`)
- IPv6 LDAP URI bracket notation (RFC 4516)
- TLS / LDAPS
- netcat (`nc -6`), journalctl

## Sources Consulted
- RFC 4516 — Lightweight Directory Access Protocol (LDAP): Uniform Resource Locator (https://www.rfc-editor.org/rfc/rfc4516)
- RFC 3986 — URI Generic Syntax (bracket notation for IPv6 literals) (https://www.rfc-editor.org/rfc/rfc3986)
- ldap.conf(5) man page (OpenLDAP) — verified `URI`, `BASE`, `TLS_CACERT`, `TLS_REQCERT` directives
- ldapsearch(1) man page — verified `-H`, `-x`, `-b`, `-D`, `-w`, `-d` flags
- sssd-ldap(5) man page — verified `ldap_uri`, `ldap_backup_uri`, `ldap_search_base`, `ldap_default_bind_dn`, `ldap_default_authtok`, `ldap_tls_cacertdir`, `ldap_tls_reqcert`, `ldap_schema`, `ldap_user_object_class`, `ldap_group_object_class`
- sssd.conf(5) man page — verified `[sssd]` services/config_file_version/domains, `cache_credentials`, `enumerate`
- nslcd.conf(5) man page — verified `uri`, `base`, `binddn`, `bindpw`, `ssl start_tls`, `tls_cacertfile`, `tls_reqcert`
- pam_succeed_if(8), pam_sss(8), pam_unix(8) man pages
- nc(1) (netcat) — `-6` IPv6, `-w` timeout flag

## Issues Found
No technical issues found.

The bracket notation for IPv6 LDAP URIs (e.g. `ldap://[2001:db8::1]:389/`) is correct per RFC 4516 / RFC 3986. All configuration directives across `ldap.conf`, `sssd.conf`, `nslcd.conf`, PAM stack, and `nsswitch.conf` are valid and use accurate field names. CLI flags for `ldapsearch` and `nc` are correct. The PAM stack ordering (`pam_unix.so` sufficient → `pam_succeed_if.so uid >= 1000` requisite → `pam_sss.so` sufficient → `pam_deny.so`) is the canonical Debian/Ubuntu pattern that limits LDAP/SSSD auth attempts to UID ≥ 1000.

## Review Notes
- `enumerate = false` in SSSD is the recommended default; enumeration is discouraged in modern deployments. The post correctly defaults to `false`.
- `ldap_schema = rfc2307` is correct; deployments using POSIX-compliant nested groups may prefer `rfc2307bis`, but rfc2307 remains a valid and common choice.
- `TLS_REQCERT demand` is the secure default. The debugging example uses `LDAPTLS_REQCERT=never` only for troubleshooting, which is appropriate guidance.
- Storing `ldap_default_authtok` in plaintext in `sssd.conf` works but production deployments often use `sss_obfuscate` to obfuscate the password (note: obfuscation is not encryption). The post correctly sets `chmod 600` permissions on the file.
- `nslcd` has been largely superseded by SSSD on most modern distributions, but it remains supported and is still appropriate for lightweight setups.
- The `nc -6 -w 3 2001:db8::1 389` test assumes BSD/OpenBSD netcat semantics (which are the default on most Linux distributions). On systems using `ncat` (nmap), the same flags apply.
