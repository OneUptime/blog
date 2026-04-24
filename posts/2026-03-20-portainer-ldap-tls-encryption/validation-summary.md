# Validation Summary: How to Set Up LDAP with TLS Encryption in Portainer

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Portainer
- LDAP / LDAPS
- TLS / X.509 certificates
- OpenSSL
- OpenLDAP `ldapsearch`
- Active Directory
- Portainer HTTP API

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer source: LDAP settings and settings model (`api/portainer.go`): https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go
- Portainer source: settings update handler (`api/http/handler/settings/settings_update.go`): https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/settings/settings_update.go
- Portainer source: TLS upload handler (`api/http/handler/upload/upload_tls.go`): https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/upload/upload_tls.go
- Portainer source: LDAP TLS file storage path (`api/filesystem/filesystem.go`): https://raw.githubusercontent.com/portainer/portainer/develop/api/filesystem/filesystem.go
- RFC 4513, LDAP authentication methods and StartTLS security considerations: https://www.rfc-editor.org/rfc/rfc4513.html
- OpenSSL `s_client` documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenLDAP `ldapsearch` man page: https://raw.githubusercontent.com/openldap/openldap/master/doc/man/man1/ldapsearch.1

## Issues Found
- The introduction and conclusion overstated LDAPS as the recommended and more secure option than StartTLS. I changed this to neutral wording. Portainer supports both `Use TLS` and `Use StartTLS`, and the security properties come from TLS itself rather than LDAPS being inherently stronger.
- Step 2 incorrectly described exporting the server certificate as exporting the CA certificate. I corrected the step to capture the presented certificate chain and clarified that Portainer expects the issuing CA certificate (`ldap-ca.pem`), not just the leaf server certificate.
- The Portainer UI example said to paste a PEM certificate into the TLS CA field. Current Portainer documentation and UI expect the CA certificate to be uploaded as a file, so I corrected that wording.
- The API example used an incorrect settings payload shape (`ldapsettings`, `Servers`, `Host`, `Port`, `UseTLS`, `SkipVerify`, `Username`) that does not match Portainer's current `LDAPSettings` model. I replaced it with the current schema using `LDAPSettings.URL`, nested `TLSConfig`, `AnonymousMode`, and `UserNameAttribute`.
- The API example tried to inline the CA certificate into the JSON payload. Portainer actually handles LDAP CA certificates through the TLS upload endpoint, so I added the required `POST /api/upload/tls/ca` step with `folder=ldap` before the `PUT /api/settings` call.
- The manual test command used `wget` against `https://ldap.example.com:636`, which attempts HTTPS rather than LDAP over TLS. I replaced it with `openssl s_client` and `ldapsearch`, which correctly test an LDAPS endpoint.
- The Active Directory example implied skipping certificate verification for self-signed certificates. I corrected it to prefer uploading the issuing or self-signed CA certificate instead of disabling verification.

## Review Notes
- The `POST /api/auth` JWT example remains valid according to Portainer's API examples, though for longer-lived automation Portainer also documents per-user API access tokens.
- The `ldapsearch -w bindpassword` examples are technically valid, but in real environments `-W` or `-y` avoids exposing the password directly in shell history or process listings.
