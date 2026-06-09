# Validation Summary: How to Implement Keycloak OIDC

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Keycloak (Identity Provider)
- OpenID Connect (OIDC)
- OAuth 2.0
- JWT / JWKS
- PKCE (Proof Key for Code Exchange)
- JavaScript / Web Crypto API (browser PKCE)
- Node.js (`jsonwebtoken`, `jwks-rsa`, `openid-client` v5.x, Express)
- React (Context API, hooks)
- Python (`requests`, `python-jose`, `httpx`, FastAPI)
- Java / Spring Boot (Spring Security 6, `spring-boot-starter-oauth2-resource-server`)
- Keycloak `kcadm.sh` Admin CLI
- Mermaid diagrams

## Sources Consulted
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Keycloak Securing Apps / OIDC Layers: https://www.keycloak.org/securing-apps/oidc-layers
- Keycloak API Documentation — `RealmRepresentation`: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/representations/idm/RealmRepresentation.html
- Keycloak API Documentation — `OIDCConfigAttributes`: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/OIDCConfigAttributes.html
- Keycloak API Documentation — OIDC protocol mappers package: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/package-summary.html
- Keycloak issue tracking the `tls.client.certificate.bound.access.tokens` attribute naming: https://github.com/keycloak/keycloak/issues/17790
- RFC 7636 — Proof Key for Code Exchange: https://datatracker.ietf.org/doc/html/rfc7636
- RFC 6749 — OAuth 2.0: https://datatracker.ietf.org/doc/html/rfc6749
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- `openid-client` v5.x API (panva/node-openid-client): https://github.com/panva/openid-client/tree/v5.x
- Spring Security Reference — OAuth2 Resource Server JWT: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- FastAPI Security Docs (`OAuth2AuthorizationCodeBearer`): https://fastapi.tiangolo.com/reference/security/
- `python-jose` documentation: https://python-jose.readthedocs.io/

## Issues Found
- **Incorrect client attribute key for mutual-TLS HoK tokens** — The "Secure Client Configuration" JSON used `"tls-client-certificate-bound-access-tokens"` (dash-separated). The canonical Keycloak attribute key documented in `OIDCConfigAttributes` is dot-separated. Changed to `"tls.client.certificate.bound.access.tokens"` to match the documented/canonical form used throughout the rest of the post (which already uses dot-separated keys like `pkce.code.challenge.method`, `backchannel.logout.session.required`, etc.).

## Review Notes
- Keycloak OIDC endpoints (`/realms/{realm}/protocol/openid-connect/{auth,token,certs,logout}`) are correct for Keycloak 17+ (post-Quarkus rewrite, which is the supported line).
- The Keycloak access token JWT payload claim `"typ": "Bearer"` is a Keycloak-specific claim (not part of the JWT spec) and is correctly described.
- All protocol mapper provider IDs used in the post (`oidc-usermodel-attribute-mapper`, `oidc-group-membership-mapper`, `oidc-audience-mapper`, `oidc-hardcoded-claim-mapper`) are valid registered providers.
- The Realm and Client representation JSON fields are all valid for current Keycloak versions.
- The `openid-client` Node.js library example targets the v5.x API. v6.x is a complete rewrite with a different functional API; readers using v6+ will need to adapt. Worth noting as a future caveat but the code is correct for the current LTS-style 5.x line.
- In the Spring Boot example, the `JwtGrantedAuthoritiesConverter` is configured with `setAuthoritiesClaimName("realm_access.roles")` but then overridden by `setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter())`. The dotted-claim-path form isn't supported by `JwtGrantedAuthoritiesConverter` (it expects a top-level claim), so that configuration block is dead code — but it's overridden anyway, so it doesn't break anything at runtime. Left as-is to avoid restructuring the example.
- The `kcadm.sh` command for retrieving the client secret uses `get clients/$CLIENT_UUID/client-secret` which is the documented endpoint for the Admin REST API's `GET /admin/realms/{realm}/clients/{id}/client-secret`. Correct.
- The PKCE JavaScript implementation correctly uses 32 random bytes (≥ 43 chars after base64url, within RFC 7636's 43–128 range) and SHA-256 with S256 method.
- The client-credentials grant in the Python example includes `scope=openid`, which is not required for that grant but harmless.
- The post broadly aligns with current OAuth 2.1 / OIDC best practices (PKCE for all clients, no implicit flow, no localStorage for tokens, BFF pattern for SPAs, server-side token validation with JWKS).
