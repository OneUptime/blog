# Validation Summary: How to Implement Keycloak Social Login

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Keycloak identity brokering and social login
- OAuth 2.0 and OpenID Connect
- Google OAuth 2.0
- GitHub OAuth Apps
- Facebook Login / Meta app configuration
- Keycloak first broker login flows
- Keycloak identity provider mappers

## Sources Consulted
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak UserAttributeMapper API documentation: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/broker/oidc/mappers/UserAttributeMapper.html
- Keycloak HardcodedAttributeMapper API documentation: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/broker/provider/HardcodedAttributeMapper.html
- Keycloak GoogleUserAttributeMapper API documentation: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/social/google/GoogleUserAttributeMapper.html
- Keycloak GitHubUserAttributeMapper API documentation: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/social/github/GitHubUserAttributeMapper.html
- Google OAuth 2.0 for Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
- GitHub Docs, Creating an OAuth app: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- Meta for Developers, Facebook Login manual flow and permissions documentation: https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow and https://developers.facebook.com/docs/permissions/
- OAuth 2.0 Authorization Framework RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749

## Issues Found
- The OAuth flow said the provider redirects back to Keycloak with tokens. In the authorization-code flow used for these social providers, the provider redirects with an authorization response and Keycloak exchanges it for tokens. Updated the wording to reflect that.
- The account-linking section described automatic linking by email as the default. Keycloak's default first broker login flow prompts for linking when an account with the same email or username exists; automatic linking requires separate authenticators and has security caveats. Updated the heading and default behavior.
- The custom first login flow listed "Automatically Link Brokered Account", which is not the Keycloak authenticator name used for automatic linking. Replaced it with the documented Handle Existing Account subflow behavior.
- The conflict-handling section described unsupported fail/overwrite/confirm options under Handle Existing Account. Replaced it with the documented Confirm Override Existing Link authenticator.
- The complete realm export used `hardcoded-attribute-idp-mapper` for importing the Google `picture` claim, which would set a fixed value instead of importing the claim. Changed it to `google-user-attribute-mapper` with `jsonField` and `userAttribute`.
- The Facebook production guidance implied App Review is required for the basic `email` and `public_profile` permissions. Updated it to distinguish public app readiness from App Review or Business Verification for additional permissions.

## Review Notes
The post remains version-neutral. Keycloak admin-console labels can shift between releases, but the provider IDs, redirect URI patterns, first broker login authenticators, and mapper concepts checked here align with current Keycloak 26.x documentation.
