# Validation Summary: How to Configure Ambassador Edge Stack with OAuth2 Filter for Authentication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- Helm
- Ambassador Edge Stack
- Ambassador Edge Stack Filter and FilterPolicy CRDs
- OAuth2
- OpenID Connect
- JWT validation
- Google OAuth2
- Auth0 OAuth2
- Microsoft Entra ID token validation

## Sources Consulted
- Ambassador Edge Stack Quick Start / installation docs: https://documentation.gravitee.io/edge-stack
- Ambassador Edge Stack OAuth2 Filter v3alpha1 API reference: https://documentation.gravitee.io/edge-stack/crd-api-references/getambassador.io-v3alpha1/filter/the-oauth2-filter-type
- Ambassador Edge Stack JWT Filter v3alpha1 API reference: https://documentation.gravitee.io/edge-stack/crd-api-references/getambassador.io-v3alpha1/filter/the-jwt-filter-type
- Ambassador Edge Stack FilterPolicy v3alpha1 API reference: https://documentation.gravitee.io/edge-stack/crd-api-references/getambassador.io-v3alpha1/filterpolicy
- Ambassador Edge Stack OAuth2 SSO guide: https://documentation.gravitee.io/edge-stack/edge-stack-user-guide/authentication/using-the-oauth2-filter-for-sso
- Ambassador Edge Stack Google SSO guide: https://documentation.gravitee.io/edge-stack/edge-stack-user-guide/authentication/single-sign-on-with-google
- Ambassador Edge Stack Auth0 SSO guide: https://documentation.gravitee.io/edge-stack/edge-stack-user-guide/authentication/single-sign-on-with-auth0
- Ambassador Edge Stack Mapping resource docs: https://documentation.gravitee.io/edge-stack/technical-reference/using-custom-resources/the-mapping-resource
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0.html

## Issues Found
1. **Outdated installation commands**: The post used the `latest` CRD URL and an old Cloud Connect token Helm value. Updated the install example to use the documented Edge Stack 3.13.1 CRD URL and `--set licenseKey.value=$LICENSE_KEY`.
2. **Incorrect OAuth2 secret format**: The post stored `client-id` and `client-secret` keys in Kubernetes Secrets. The documented `secretName` flow expects a generic Secret containing `oauth2-client-secret`. Updated the Secret examples and all Filter examples to use `secretName`.
3. **Incorrect `authorizationURL` values**: The post used provider `/authorize` endpoints. Ambassador Edge Stack expects the issuer URL that exposes OIDC discovery at `/.well-known/openid-configuration`. Updated Google, Auth0, Azure, and generic provider examples.
4. **Missing required `protectedOrigins`**: Several OAuth2 Filter examples omitted `protectedOrigins`, which is required for Authorization Code flow. Added appropriate `protectedOrigins` entries.
5. **Unsupported OAuth2 Filter fields**: Removed or replaced unsupported fields including `scopes`, `cookieName`, `cookieDomain`, `cookiePath`, `cookieHttpOnly`, `cookieSecure`, `cookieSameSite`, `redirectURL`, `allowedRedirectURLs`, `useRefreshToken`, and `refreshTokenExpiryBuffer`.
6. **Scopes placed on the wrong resource**: The post configured scopes directly on the OAuth2 Filter. Updated examples to pass scopes through FilterPolicy filter arguments where the OAuth2 filter is applied.
7. **Invalid direct Mapping filter usage**: The post showed `filters` on a Mapping. The documented model applies Filters through FilterPolicy, so the Mapping example now only defines routing and references the FilterPolicy behavior in prose.
8. **Incorrect accessTokenJWTFilter shape**: The post embedded JWT validation fields under `accessTokenJWTFilter`. The documented field references a separate JWT Filter by name. Added a JWT Filter resource and changed `accessTokenJWTFilter` to reference it.
9. **Incorrect header template paths**: The post used `.token.email`, `.token.sub`, and `.token.name`, but documented templates expose parsed claims under `.token.Claims` and `.idToken.Claims`. Updated the examples to use `.idToken.Claims` for OIDC profile claims.
10. **Misleading cookie troubleshooting and testing**: The post referenced a custom cookie name that is not configurable through the documented OAuth2 Filter fields. Updated the testing and troubleshooting text to refer to the Ambassador Edge Stack session cookie and `protectedOrigins`.

## Review Notes
- The examples now target the documented `getambassador.io/v3alpha1` CRDs. Ambassador Edge Stack also has newer `gateway.getambassador.io/v1alpha1` resources, including PKCE support in Edge Stack 3.10+, which could be covered in a future update.
- YAML snippets were parsed successfully after the edits. The examples were not applied to a live Kubernetes cluster during this review.
