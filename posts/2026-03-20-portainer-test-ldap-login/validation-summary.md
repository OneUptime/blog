# Validation Summary: How to Test LDAP Login Configuration in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer authentication settings
- LDAP
- OpenLDAP `ldapsearch`
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer API access documentation (`X-API-Key` authentication): https://docs.portainer.io/2.21/api/access
- Portainer troubleshooting FAQ for LDAP login issues: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-login-via-ldap-in-portainer
- Portainer source: LDAP connectivity handler (`/ldap/check`): https://github.com/portainer/portainer/blob/develop/api/http/handler/ldap/ldap_check.go
- Portainer source: LDAP handler route registration: https://github.com/portainer/portainer/blob/develop/api/http/handler/ldap/handler.go
- Portainer source: LDAP authentication flow: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: LDAP search and bind behavior: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer source: legacy LDAP REST client routes: https://github.com/portainer/portainer/blob/develop/app/portainer/settings/authentication/ldap/ldap.rest.js
- OpenLDAP 2.6 Administrator's Guide: https://www.openldap.org/doc/admin26/OpenLDAP-Admin-Guide.pdf
- Local OpenLDAP `ldapsearch` usage output from the installed OpenLDAP 2.6.7 package

## Issues Found
1. **Portainer's built-in test flow was described incorrectly.** The draft implied that clicking a connectivity button immediately prompts for username/password. Current Portainer docs show separate actions: **Test connectivity** for the server/bind check, then a **Test login** section where you enter a username and password. I updated Step 1 to reflect the actual UI flow.
2. **The username guidance was too specific.** The draft said to enter the username "without domain, just the uid value". Portainer's docs say the username format depends on the configured username attribute and setup. I changed this to "use the format your Portainer configuration expects".
3. **The anonymous `ldapsearch` example used the wrong base DN for a root-DSE check.** Querying `supportedLDAPVersion` as a server capability check should use base DN `""` with scope `base`, not `dc=example,dc=com`. I corrected the command and the expected-result note.
4. **The direct-bind example overstated how closely it matched Portainer's authentication flow.** Portainer first searches for the user's DN using the configured Base DN, filter, and username attribute, then binds as that DN. I clarified that the example tests the final bind step only.
5. **The API example used an incorrect endpoint and auth pattern.** The draft called `POST /api/settings/authentication/checkLDAP` with a Bearer token from `/api/auth`. Current Portainer docs and source expose the documented admin connectivity check at `POST /api/ldap/check`, and the API docs document `X-API-Key` for access tokens. I replaced the example accordingly and limited it to connectivity, which is what the documented endpoint validates.
6. **Two `ldapsearch` examples were placeholders rather than executable commands.** The `ldapsearch ...` lines in Scenario 1 would not run as written. I replaced them with full commands.

## Review Notes
- Portainer's current docs and source support a built-in UI login test plus a documented API connectivity check. The public API guidance in the post now sticks to the documented connectivity endpoint.
- Portainer's group-to-team synchronization uses DN-based membership lookups against the configured group membership attribute. The generic `member=<full user DN>` example in the post aligns with that model; the AD `memberOf` query is useful as a diagnostic check.
- The post does not pin a Portainer version. I validated it against current Portainer documentation available on April 24, 2026 and the current public Portainer source tree.
