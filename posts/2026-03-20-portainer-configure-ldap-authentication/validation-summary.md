# Validation Summary: How to Configure LDAP Authentication in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- LDAP
- OpenLDAP
- Active Directory
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer Business Edition 2.39.1 OpenAPI schema: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer documentation source for the LDAP guide: https://raw.githubusercontent.com/portainer/portainer-docs/2.39/admin/settings/authentication/ldap.md
- Portainer source for LDAP and TLS structs: https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go
- Portainer source for the settings update handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/settings/settings_update.go
- Portainer source for the LDAP connectivity check handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/ldap/ldap_check.go

## Issues Found
- The introduction stated that Portainer always creates local users on first LDAP login. I corrected this to make user creation conditional on automatic user provisioning, which matches Portainer’s LDAP documentation.
- The LDAPS example used outdated field wording and said to paste a CA certificate. I updated this to Portainer’s current `Use TLS` and certificate upload terminology and clarified the certificate verification behavior.
- The group search example used `memberOf` for the group membership attribute. Portainer’s documentation and source use the group-side membership attribute such as `member`, so this was corrected.
- The API configuration example used an outdated payload shape and stale field names such as `ldapsettings`, `Servers`, `Anonymous`, `UseTLS`, `SkipVerify`, and `Username`. I updated the example to the current Portainer API field names: `LDAPSettings`, `URLs`, `AnonymousMode`, `TLSConfig`, and `UserNameAttribute`.
- The API login test example used the outdated `/api/auth/ldap/check` path and lowercase payload keys. I corrected it to the current `/api/ldap/test` endpoint and the documented `Username` / `Password` request fields.
- The testing section mixed up Portainer’s connectivity test and login test. I split the description so it matches the current UI flow: `Test connectivity` for server validation and `Test login` for authenticating a user.
- The automatic provisioning section incorrectly described assigning LDAP users to a default team. I corrected this to match Portainer’s documented behavior of optional team mapping through LDAP group search and matching Portainer team names.
- The conclusion described LDAP authentication as single sign-on. I replaced that wording with directory-backed sign-in wording, since LDAP authentication by itself is not SSO.

## Review Notes
- The API examples were validated against the current official Portainer Business Edition 2.39.1 API schema available on 2026-04-24.
- Portainer also provides a dedicated Active Directory authentication mode. The post’s AD-specific LDAP example remains technically plausible, but environments that want AD-specific features should evaluate the dedicated AD integration documented by Portainer.
