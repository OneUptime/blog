# Validation Summary: How to Configure LDAP TLS over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenLDAP (slapd)
- LDAP / LDAPS (port 636)
- StartTLS (RFC 4511 extended operation)
- TLS / X.509 certificates
- OpenSSL (certificate generation, s_client)
- IPv6 (URI bracket syntax per RFC 3986/2732)
- SSSD (System Security Services Daemon)
- ldapsearch / ldapmodify CLI tools
- systemd (slapd unit)

## Sources Consulted
- OpenLDAP Admin Guide — TLS configuration: https://www.openldap.org/doc/admin26/tls.html
- OpenLDAP slapd-config(5) man page (olcTLS* attributes, olcSecurity)
- ldap.conf(5) man page (TLS_CACERT, TLS_REQCERT, URI directives)
- ldapsearch(1) man page (-Z/-ZZ for StartTLS, -H for URI, -d debug levels)
- sssd-ldap(5) man page (ldap_tls_cacert, ldap_tls_reqcert, ldap_tls_cert, ldap_tls_key, ldap_uri)
- RFC 4513 — LDAP: Authentication Methods and Security Mechanisms
- RFC 4511 — LDAP: The Protocol (StartTLS)
- RFC 3986 / RFC 2732 — IPv6 literal addresses in URIs (bracket syntax)
- OpenSSL req(1) and x509v3_config(5) man pages (SAN syntax with IP entries)
- Debian slapd package documentation (/etc/default/slapd, SLAPD_SERVICES)

## Issues Found
No technical issues found.

## Review Notes
- The `SLAPD_SERVICES` example lists both `ldap:///` and `ldap://[::]/` (and similarly for `ldaps://`). The bare `ldap:///` form already binds to all interfaces (IPv4 + IPv6 where available), so the explicit `[::]` form is redundant but not incorrect — the explicit form can be useful on systems where IPv4/IPv6 interface binding behavior differs, so this is a defensible pedagogical choice.
- The troubleshooting `openssl s_client ... | openssl x509 -noout -text` pipeline relies on `openssl x509` extracting the first PEM block from the s_client output. This works in practice, though `-showcerts` would make it more reliable; the existing form is acceptable.
- The illustrative error message "TLS: hostname does not match CN in peer certificate" approximates the real OpenLDAP error (exact wording varies by version, e.g., "TLS: hostname does not match name in peer certificate"), but is presented as a representative example, not a literal log match — acceptable as written.
- The `/etc/default/slapd` path and `SLAPD_SERVICES` variable are Debian/Ubuntu-specific; on RHEL/CentOS/Fedora the equivalent is `/etc/sysconfig/slapd` with `SLAPD_URLS`. The post does not call this out, but its OpenLDAP/LDIF content is distribution-agnostic.
- For production deployments, `TLS_REQCERT demand` (the recommended value used in the post) and avoidance of `LDAPTLS_REQCERT=never` outside of testing are correctly emphasized.
