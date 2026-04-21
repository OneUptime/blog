# Validation Summary: How to Test LDAP Login Configuration in Portainer - Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer authentication settings
- Portainer HTTP API
- LDAP and LDAPS
- OpenLDAP command-line tools (`ldapsearch`, `ldapwhoami`)
- LDAP search filters

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer API documentation overview: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI specification: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source for LDAP API handler and settings structs: https://github.com/portainer/portainer/blob/develop/api/http/handler/ldap/ldap_check.go, https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for LDAP connectivity behavior: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- OpenLDAP `ldapsearch` manual page: https://man7.org/linux/man-pages/man1/ldapsearch.1.html
- OpenLDAP `ldapwhoami` manual page: https://man7.org/linux/man-pages/man1/ldapwhoami.1.html
- RFC 4515 LDAP search filter syntax: https://datatracker.ietf.org/doc/html/rfc4515

## Issues Found
- The API authentication example used lowercase `username` and `password` fields. The current Portainer CE OpenAPI schema documents `Username` and `Password`, so the example was updated to match the official API schema.
- The LDAP connectivity API example used `URLs` with an `ldaps://` URI. Portainer CE's `LDAPSettings` schema uses `URL`, and the LDAP service passes that value to the LDAP client as a `host:port` network address while `TLSConfig.TLS` controls LDAPS. The example was changed to `"URL": "ldap.example.com:636"` with `TLSConfig.TLS` left enabled.

## Review Notes
- Portainer's current user-facing API documentation recommends API access tokens with the `X-API-Key` header for API automation, but the OpenAPI spec and source still support JWT authentication for `/api/ldap/check`; the post's bearer-token approach remains technically valid.
- The `memberOf` lookup example is correct for directories that expose `memberOf`, such as Active Directory or OpenLDAP installations with the appropriate overlay/configuration. Some LDAP directories may require group membership searches via `member`, as shown in the previous example.
