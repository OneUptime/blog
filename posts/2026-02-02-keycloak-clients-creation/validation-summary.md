# Validation Summary: How to Create Keycloak Clients

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- Keycloak (Admin Console, kcadm.sh CLI, Admin REST API)
- OpenID Connect (OIDC)
- OAuth 2.0 (Authorization Code, Client Credentials, PKCE)
- JWT (client_assertion / client-jwt authentication)
- mTLS / X.509 client authentication
- curl, jq, bash, openssl (for CLI/REST examples and PKCE generation)

## Sources Consulted
- Keycloak Server Administration Guide — https://www.keycloak.org/docs/latest/server_admin/
- Keycloak Securing Applications and Services Guide — https://www.keycloak.org/docs/latest/securing_apps/
- Keycloak Admin CLI (kcadm.sh) reference — https://www.keycloak.org/docs/latest/server_admin/index.html#admin-cli
- Keycloak Admin REST API — https://www.keycloak.org/docs-api/latest/rest-api/
- OIDC Protocol Mappers (Javadocs) — https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/package-summary.html
- RFC 7636 (PKCE) — https://datatracker.ietf.org/doc/html/rfc7636
- RFC 7521/7523 (JWT client assertions) — https://datatracker.ietf.org/doc/html/rfc7523

## Issues Found
No technical issues found.

The post was verified across all major sections:

- **Admin Console path**: `/admin/master/console/` is the canonical SPA URL the Keycloak admin console is served from (the shorter `/admin/` redirects there). Correct.
- **kcadm.sh commands**: `config credentials`, `create clients`, `get clients`, `update clients`, `add-roles` and their flags (`-r`, `-s`, `-q`, `--fields`, `--format csv`, `--noquotes`, `--uid`, `--cclientid`, `--rolename`, `-o`, `-f`) all match the official kcadm.sh reference.
- **REST API endpoints**: `/admin/realms/{realm}/clients`, `/admin/realms/{realm}/clients/{id}/client-secret` (GET to retrieve, POST to regenerate), and `/realms/{realm}/protocol/openid-connect/token` are all correct paths.
- **Client JSON fields**: `clientId`, `protocol`, `publicClient`, `bearerOnly`, `standardFlowEnabled`, `implicitFlowEnabled`, `directAccessGrantsEnabled`, `serviceAccountsEnabled`, `redirectUris`, `webOrigins`, `clientAuthenticatorType`, `consentRequired`, `surrogateAuthRequired`, `notBefore`, `nodeReRegistrationTimeout`, `frontchannelLogout`, `fullScopeAllowed`, `alwaysDisplayInConsole`, `authenticationFlowBindingOverrides`, `defaultClientScopes`, `optionalClientScopes` — all are valid `ClientRepresentation` fields.
- **clientAuthenticatorType values**: `client-secret`, `client-jwt`, `client-x509` are all valid.
- **Attribute keys**: `oidc.ciba.grant.enabled`, `oauth2.device.authorization.grant.enabled`, `backchannel.logout.session.required`, `backchannel.logout.revoke.offline.tokens`, `access.token.lifespan`, `client.session.idle.timeout`, `client.session.max.lifespan`, `pkce.code.challenge.method`, `token.endpoint.auth.signing.alg`, `x509.subjectdn` are all the correct attribute keys used by Keycloak.
- **Protocol mappers**: `oidc-usermodel-attribute-mapper` and `oidc-audience-mapper` are the correct provider IDs, and the config keys (`user.attribute`, `claim.name`, `jsonType.label`, `id.token.claim`, `access.token.claim`, `userinfo.token.claim`, `included.client.audience`, `included.custom.audience`) are correct.
- **PKCE generation**: The `code_verifier` (43+ char URL-safe) and `code_challenge` (base64url-encoded SHA-256) generation in bash conform to RFC 7636. The use of `tr -d '=+/'` to strip non-URL-safe base64 characters followed by `cut -c1-43` is a standard idiom that produces a compliant verifier.
- **Authorization Code + PKCE for public clients**: Recommendation is consistent with current OAuth 2.0 Security BCP (RFC 9700) guidance.
- **Token endpoint URL** (`/realms/{realm}/protocol/openid-connect/token`) and **auth endpoint URL** (`/realms/{realm}/protocol/openid-connect/auth`) are correct for the OIDC discovery document.

## Review Notes
- **Bearer-only clients**: The post presents bearer-only clients as a current client category. This is still functional in Keycloak, but the option is increasingly de-emphasized in modern Keycloak (e.g., the Admin Console UI for newer versions hides the `Bearer-only` toggle by default and steers users toward confidential clients with `standardFlowEnabled=false` instead). The post's coverage is not technically wrong, but a future revision could note that bearer-only is considered legacy and recommend a confidential client with only the necessary flows enabled.
- **Wildcard redirect URIs in dev examples**: `http://localhost:3000/*` works but the post itself later (correctly) cautions against wildcard redirects in production. The dev-only context is reasonable, but worth noting that Keycloak has tightened wildcard handling over recent releases — pattern-only wildcards (no path-level matching beyond a trailing `*`) are accepted.
- **`frontchannelLogout: true` combined with `backchannel.logout.session.required: "true"`**: This is a valid (and common) belt-and-suspenders combination, but readers should know they don't have to enable both; either logout channel alone is sufficient depending on the relying party.
- **`base64 -d`** in the "Validate Token Claims" example may emit padding errors on some JWT payloads (since JWT segments use base64url without padding). The `2>/dev/null` already suppresses the stderr noise, and `jq` will still parse the output, so this works in practice — but `base64 -d` is GNU-specific; macOS users would need `base64 -D`. Not an error, just a portability note.
- **Service accounts**: The post correctly notes that `serviceAccountsEnabled=true` requires `Client authentication: ON` (confidential client) and that `standardFlowEnabled` can/should be off for pure machine-to-machine clients.
