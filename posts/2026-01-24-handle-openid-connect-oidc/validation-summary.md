# Validation Summary: How to Handle OpenID Connect (OIDC)

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- OpenID Connect (OIDC)
- OAuth 2.0
- Provider discovery / well-known OpenID configuration
- ID tokens, access tokens, refresh tokens, and UserInfo
- Node.js, Express, express-session, openid-client
- Python, Flask, Authlib
- JWT validation with jsonwebtoken and jwks-rsa
- PKCE
- OIDC provider examples: Google, Microsoft Entra ID, Okta, Auth0, Keycloak

## Sources Consulted
- OpenID Connect Core 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-discovery-1_0.html
- RFC 9700, Best Current Practice for OAuth 2.0 Security: https://datatracker.ietf.org/doc/rfc9700/
- Google Sign-In OpenID Connect documentation: https://developers.google.com/identity/openid-connect/openid-connect
- Authlib Web OAuth Clients documentation: https://docs.authlib.org/en/stable/oauth2/client/web/index.html
- openid-client package documentation and npm metadata: https://www.npmjs.com/package/openid-client
- openid-client v5 API examples / package documentation: https://unpkg.com/openid-client@5.7.1/README.md
- jsonwebtoken npm metadata: https://www.npmjs.com/package/jsonwebtoken
- jwks-rsa npm metadata: https://www.npmjs.com/package/jwks-rsa

## Issues Found
- The Node.js examples used the `openid-client` v5 CommonJS API (`Issuer`, `generators`, `authorizationUrl`, `callback`) but the install command installed the latest unpinned package. The latest `openid-client` major version is ESM-first and uses a different API, so the examples would not work as written. Changed the install command to `npm install openid-client@5 express-session` and labeled the section as `openid-client v5`.
- The OAuth/OIDC comparison overstated token, discovery, and user-info behavior by saying OAuth has "Access Token only", OAuth discovery is always manual, and OIDC has user info "Included in ID Token". Updated the table to account for refresh tokens, provider metadata, and the fact that OIDC profile/email claims may be returned through ID token claims and/or the UserInfo endpoint.
- The Node logout example read `req.session.idToken` but never stored the ID token during login. Added `req.session.idToken = tokenSet.id_token;` after the callback succeeds so RP-initiated logout can use `id_token_hint`.
- The UserInfo comment said the ID token "usually has enough" user information. Changed it to "may already have enough" because requested profile/email claims are not guaranteed to be present in every ID token.
- The custom ID token validator hardcoded `${issuer}/.well-known/jwks.json`, which is not the standard way to find signing keys and is incorrect for Google. Updated the validator to accept a `jwksUri` from provider metadata and changed the Google example to use Google's documented `https://www.googleapis.com/oauth2/v3/certs` JWKS URI.
- The validation flow listed `at_hash` checking, but the custom validator never called `validateAtHash`. Updated `validate` to accept an optional access token and reject on `at_hash` mismatch when the claim is present.
- The `at_hash` helper did not handle unsupported signing algorithms before calling `crypto.createHash`. Added an explicit error for unsupported algorithms.

## Review Notes
- The post is now technically coherent for the pinned `openid-client@5` examples. Future updates could migrate the Node.js examples to `openid-client` v6, whose current API uses ESM imports and functions such as `discovery`, `buildAuthorizationUrl`, and `authorizationCodeGrant`.
- The examples remain intentionally simplified and omit production details such as persistent server-side session stores, robust error handling, token rotation policy, and provider-specific logout registration requirements.
