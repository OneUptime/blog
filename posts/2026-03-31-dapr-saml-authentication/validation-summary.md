# Validation Summary: How to Use Dapr with SAML Authentication

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (middleware.http.bearer component)
- SAML 2.0 (authentication protocol)
- Authelia (OpenID Connect provider)
- OAuth2/OIDC (token-based authentication)
- Python / Flask (application code example)
- PyJWT library

## Sources Consulted
- Dapr bearer middleware documentation: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr components-contrib source (middleware/http/bearer/metadata.go) for field name verification
- Authelia official documentation: https://www.authelia.com/configuration/identity-providers/introduction/
- Authelia OIDC provider configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/provider/
- Authelia OIDC clients configuration: https://www.authelia.com/configuration/identity-providers/openid-connect/clients/
- Authelia server configuration: https://www.authelia.com/configuration/miscellaneous/server/
- Authelia SAML 2.0 roadmap (still in planning): https://www.authelia.com/roadmap/planning/security-assertion-markup-language-saml-2.0-identity-provider/
- GitHub Issue authelia/authelia#493: SAML IdP support request (still open)

## Issues Found

1. **False claim: Authelia supports SAML 2.0** — The post stated "Authelia supports SAML 2.0 and can issue OAuth2/OIDC tokens after SAML authentication." This is incorrect. Authelia does not support SAML at all — neither as a Service Provider nor as an Identity Provider. SAML 2.0 IdP support is still in the planning phase on Authelia's roadmap. Fixed by removing the false SAML claim, clarifying that Authelia serves as an OIDC provider only, and recommending Keycloak or oauth2-proxy as the actual SAML-to-OIDC bridge.

2. **Architecture diagram listed Authelia as a SAML SP** — The diagram showed "SAML SP (e.g., oauth2-proxy or Authelia)" which is misleading since Authelia cannot act as a SAML SP. Fixed by changing to "SAML-to-OIDC Bridge (e.g., Keycloak or oauth2-proxy)".

3. **Outdated Authelia configuration format** — Multiple deprecated config fields were used:
   - `server.host` / `server.port` replaced by `server.address` (since v4.38)
   - `issuer_private_key` replaced by `jwks` list (since v4.38, slated for removal in v5.0)
   - Client fields `id` / `secret` should be `client_id` / `client_secret`
   - `session.domain` replaced by `session.cookies[].domain`
   - `authentication_backend.ldap.url` replaced by `authentication_backend.ldap.address`
   - `client_secret` should be hashed, not plaintext
   All fixed to current Authelia configuration format.

4. **Missing context for disabled JWT signature verification** — The Python code used `jwt.decode(token, options={"verify_signature": False})` with no explanation. While this is defensible because Dapr's bearer middleware validates the signature upstream, it is a dangerous pattern to show without context in a security-focused blog post. Added an inline comment explaining that signature verification is handled by Dapr's middleware.

5. **Summary referenced Authelia as SAML SP** — The concluding summary described Authelia as "a SAML service provider...that converts SAML assertions into JWT tokens." Fixed to reference Keycloak or oauth2-proxy as the SAML bridge.

## Review Notes
- The Dapr middleware configuration (`middleware.http.bearer` with `jwksURL`, `audience`, `issuer` metadata fields) and the pipeline configuration are all correct per current Dapr documentation.
- The Python/Flask code is syntactically correct and uses the PyJWT library API properly. The `verify_signature: False` pattern is acceptable in this specific architecture where Dapr has already validated the token, but readers should be cautious about reusing this pattern outside of a Dapr context.
- The overall architectural pattern (SAML-to-OIDC bridge in front of Dapr) is sound and represents a valid approach for integrating enterprise SAML IdPs with Dapr services.
- oauth2-proxy does support SAML authentication and is a valid choice for the SAML SP role in this architecture.
