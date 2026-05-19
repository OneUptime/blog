# Validation Summary: How to Secure OpenLDAP with TLS on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenLDAP (slapd) on Ubuntu
- TLS / StartTLS / LDAPS
- OpenSSL (for certificate generation and `s_client` testing)
- Let's Encrypt / Certbot (ACME standalone mode)
- AppArmor (slapd profile)
- LDIF / `cn=config` (olcTLS* attributes, olcSecurity)
- `ldapsearch`, `ldapmodify`, `/etc/ldap/ldap.conf`
- `/etc/default/slapd` (SLAPD_SERVICES)

## Sources Consulted
- OpenLDAP `slapd-config(5)` man page (olcTLS* attributes, olcSecurity, olcTLSProtocolMin format)
- OpenLDAP Administrator's Guide — TLS chapter
- OpenSSL `s_client(1)` man page (`-starttls` supported protocols, including `ldap` added in 1.1.1)
- Debian/Ubuntu source-package metadata for OpenLDAP / slapd on Jammy (22.04) and Noble (24.04): both build with `--with-tls=gnutls` and depend on `libgnutls30`
- GnuTLS priority string documentation (`SECURE256`, `SECURE128`, `VERS-TLS1.2`, `VERS-TLS1.3`)
- Certbot documentation for `--standalone` mode and `/etc/letsencrypt/live/<domain>/` file layout (`cert.pem`, `privkey.pem`, `chain.pem`, `fullchain.pem`)
- `ldapsearch(1)` man page (`-x`, `-H`, `-Z`, `-D`, `-W`, positional filter)
- Debian Bug #1093578 (planned slapd switch from GnuTLS to OpenSSL — not yet applied to 22.04 or 24.04)

## Issues Found

1. **`cat > san.conf` would fail with permission denied.** After `sudo mkdir -p /etc/ldap/ssl` and `cd /etc/ldap/ssl`, a non-root user cannot write into a root-owned `/etc/ldap/ssl` directory (default umask 022). Fixed by changing the heredoc to `sudo tee san.conf > /dev/null << 'EOF'`.

2. **`olcTLSCipherSuite: HIGH:MEDIUM:+SSLv3` is OpenSSL syntax, but Ubuntu's slapd uses GnuTLS.** On both Ubuntu 22.04 (slapd 2.5.x) and Ubuntu 24.04 (slapd 2.6.10), the `slapd` and `libldap` packages are built with `--with-tls=gnutls` and link against `libgnutls30`. GnuTLS requires a priority string (e.g. `SECURE256:+SECURE128:-VERS-ALL:+VERS-TLS1.3:+VERS-TLS1.2`), not an OpenSSL cipher list. The original value would either be rejected by GnuTLS or interpreted very differently. Replaced with a modern GnuTLS priority string and added a short sentence calling out the GnuTLS backend so readers understand why the syntax matters. (The Debian transition to OpenSSL is tracked in bug #1093578 but has not landed in these Ubuntu LTS releases.)

## Review Notes

- `olcTLSProtocolMin: 3.3` correctly requires TLS 1.2 minimum and is honored under both GnuTLS and OpenSSL backends per `slapd-config(5)`.
- `olcSecurity: tls=1` is the correct LDIF syntax to require an SSF of at least 1 with TLS on a database.
- `openssl s_client -starttls ldap` is supported in OpenSSL 1.1.1+ and present on all currently-supported Ubuntu LTS releases.
- The `ldapsearch -W "(objectClass=*)"` form is correct: `-W` is a no-arg flag that triggers a password prompt, and `(objectClass=*)` is parsed as the positional filter argument.
- The Let's Encrypt `cert.pem` + `chain.pem` split is a valid pairing for `olcTLSCertificateFile` / `olcTLSCACertificateFile`. Readers should be aware that `/etc/letsencrypt/live/` and `/etc/letsencrypt/archive/` are root-only by default, which is why the deploy hook copies files into a slapd-readable location — the post handles this correctly.
- The cipher suite recommendation will need updating once Debian/Ubuntu ship slapd linked against OpenSSL (expected after the bug #1093578 transition reaches a future Ubuntu LTS). At that point, OpenSSL cipher-list syntax (`HIGH:!aNULL:!MD5:!RC4`) would be appropriate instead.
- The `+SSLv3` token in the original cipher string is a common OpenSSL-era leftover; it does not actually re-enable the SSLv3 protocol (especially with `olcTLSProtocolMin: 3.3`) but is misleading.
