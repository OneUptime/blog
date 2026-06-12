# Validation Summary: How to Configure Keycloak Realms and Clients

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Keycloak realms and clients
- Keycloak Admin CLI (`kcadm.sh`)
- OpenID Connect
- OAuth 2.0 grant flows
- PKCE
- JWT access tokens
- Protocol mappers, client scopes, roles, users, and groups
- Postman collections

## Sources Consulted
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak Admin REST API: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Keycloak ClientRepresentation Javadocs: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/representations/idm/ClientRepresentation.html
- Keycloak RealmRepresentation Javadocs: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/representations/idm/RealmRepresentation.html
- Keycloak OpenID Connect endpoint documentation: https://www.keycloak.org/securing-apps/oidc-layers
- OAuth 2.0 Authorization Framework, RFC 6749: https://www.rfc-editor.org/rfc/rfc6749
- Proof Key for Code Exchange, RFC 7636: https://www.rfc-editor.org/rfc/rfc7636
- OAuth 2.0 Security Best Current Practice, RFC 9700: https://www.rfc-editor.org/rfc/rfc9700
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html

## Issues Found
- The article described Keycloak as supporting three current client types, including bearer-only. Current Keycloak documentation still recognizes `confidential`, `public`, and `bearer-only` access types, but explicitly calls bearer-only deprecated. Changed the wording to say confidential and public clients cover most modern use cases, and that bearer-only is deprecated.
- The resource owner password flow warning was too mild for current OAuth guidance. Updated it to recommend Authorization Code Flow with PKCE for user sign-in and limit password grants to trusted first-party applications.
- The `kcadm.sh update clients/$CLIENT_ID/default-client-scopes/$SCOPE_ID` example targets a no-body Admin REST endpoint. Added `-n`, matching Keycloak Admin CLI usage for no-body update calls.
- The user-to-group assignment example omitted the no-body update pattern shown in the official Keycloak Admin CLI documentation. Added `realm`, `userId`, `groupId`, and `-n` to make the command match documented usage.
- The JWT debug decode command used plain `base64 -d` directly on a JWT payload segment. JWTs use base64url encoding and may omit padding, so the command could fail for valid tokens. Updated the snippet to translate base64url characters and add padding before decoding.

## Review Notes
- The remaining realm, client, role, group, protocol mapper, token endpoint, discovery endpoint, introspection endpoint, and Postman examples align with current Keycloak Admin REST and OpenID Connect behavior.
- The article intentionally uses example secrets and localhost/example.com URLs; these are acceptable placeholders, and the production section correctly warns against broad redirect URI wildcards and unused flows.
