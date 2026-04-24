# Validation Summary: How to Configure LDAP User Search Base DN in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- LDAP
- OpenLDAP
- Active Directory
- `ldapsearch`
- Portainer HTTP API

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI schema: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source for LDAP settings and search behavior: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for LDAP search scope and filter construction: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer auth handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer settings update handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- OpenLDAP overlays documentation (`memberof` overlay): https://www.openldap.org/devel/admin/overlays.html
- OpenLDAP Administrator's Guide: https://www.openldap.org/doc/admin25/OpenLDAP-Admin-Guide.pdf
- Microsoft LDAP matching rules documentation: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/4e638665-f466-4597-93c4-12f2ebfabab5

## Issues Found
- The Portainer API example used an outdated/incorrect LDAP settings payload. I changed `ldapsettings` to `LDAPSettings`, replaced the unsupported `Servers` array with the documented `URL`, added `ReaderDN` and `Password`, and changed `Username` to Portainer's documented `UserNameAttribute` field so the example matches the current Portainer schema.
- The `/api/auth` example used lowercase credential keys. I changed them to `Username` and `Password` to align the example with Portainer's published API schema and handler definitions.
- The OpenLDAP `pwdAccountLockedTime` example was described as excluding disabled accounts. I narrowed this to OpenLDAP deployments using password policy lockout semantics, because `pwdAccountLockedTime` indicates locked accounts rather than serving as a generic disabled-account flag across LDAP implementations.
- The generic `memberOf` filter example needed a directory-specific caveat. I clarified that it applies when the directory populates the `memberOf` attribute.
- The performance table used precise user-count thresholds that are not documented by Portainer and are too environment-dependent to present as hard guidance. I changed the table to relative scope/cost guidance.

## Review Notes
- Portainer's LDAP implementation searches each configured `BaseDN` with subtree scope, which matches the post's explanation.
- The Active Directory filters using `1.2.840.113556.1.4.803` and `1.2.840.113556.1.4.1941` are valid for AD environments; the transitive match rule is AD-specific.
- The `ldapsearch` command examples are syntactically valid for OpenLDAP client tools, but attribute availability still depends on the target directory schema and overlays.
