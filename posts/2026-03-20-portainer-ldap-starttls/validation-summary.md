# Validation Summary: How to Set Up LDAP with StartTLS Encryption in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer authentication settings
- LDAP
- StartTLS and LDAPS
- OpenLDAP `ldapsearch`
- OpenSSL `s_client`
- TLS certificate validation

## Sources Consulted
- Portainer LDAP documentation: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer 2.39.1 `LDAPSettings` and TLS types: https://github.com/portainer/portainer/blob/2.39.1/api/portainer.go
- Portainer 2.39.1 settings update handler: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/settings/settings_update.go
- Portainer 2.39.1 TLS upload handler: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/upload/upload_tls.go
- Portainer 2.39.1 frontend LDAP TLS upload flow: https://github.com/portainer/portainer/blob/2.39.1/app/portainer/services/fileUpload.js
- RFC 4511, LDAP StartTLS operation: https://www.rfc-editor.org/rfc/rfc4511.html
- RFC 4512, root DSE and `supportedExtension`: https://www.rfc-editor.org/rfc/rfc4512.html
- OpenLDAP `ldapsearch` man page: https://git.openldap.org/openldap/openldap/-/raw/OPENLDAP_AC_BP/doc/man/man1/ldapsearch.1
- OpenLDAP FAQ on TLS/SSL and StartTLS vs LDAPS: https://www.openldap.org/faq/data/cache/185.html
- OpenLDAP FAQ on discovering supported extensions from the root DSE: https://www.openldap.org/faq/data/cache/1011.html
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/

## Issues Found
- The introduction described StartTLS as a "middle ground" between plain LDAP and LDAPS. I changed this to describe StartTLS as an alternative to LDAPS, because the standards and OpenLDAP documentation treat it as a TLS upgrade mechanism rather than a weaker in-between mode.
- The comparison table overstated compatibility with "All servers" and "Modern servers". I changed the compatibility row to reflect the actual requirements for each mode.
- The `ldapsearch` example for `supportedExtension` queried a normal base DN. I changed it to query the root DSE with `-b "" -s base`, which is where `supportedExtension` is published.
- The certificate retrieval section implied that piping `openssl s_client ... | openssl x509 > ldap-ca.pem` always retrieves the CA certificate. I corrected this to distinguish between saving a self-signed server certificate and exporting the issuing CA certificate when the server uses a CA-issued certificate.
- The Portainer UI instructions said to paste PEM content into the TLS CA field. I changed this to a file upload instruction, which matches Portainer's documented and current UI behavior.
- The Portainer API example used an incorrect payload shape and field names for current Portainer releases. I replaced it with a 2.39.1-compatible flow: upload the CA file to `/api/upload/tls/ca?folder=ldap`, then update `/api/settings` with `LDAPSettings`, `URL`, `TLSConfig`, `StartTLS`, and `SearchSettings`.
- The troubleshooting note treated a specific `ldap_start_tls` error string as meaning only "StartTLS not supported". I generalized it to reflect that such errors indicate StartTLS negotiation failure, which can also be caused by certificate trust or handshake issues.

## Review Notes
- Portainer's public docs currently point to API documentation version 2.39.1, and the post was validated against that release shape plus the matching 2.39.1 source tree.
- The shell examples still use `-w bindpassword` for clarity. That is valid, but prompting with `-W` or reading secrets from a file is safer for production usage.
