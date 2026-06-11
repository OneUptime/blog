# Validation Summary: How to Build Just-In-Time Provisioning

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Just-In-Time provisioning
- SAML SSO
- OpenID Connect
- Passport.js
- TypeScript
- JSON Web Tokens
- Identity provider claims and group-to-role mapping

## Sources Consulted
- Passport OpenID Connect strategy documentation: https://www.passportjs.org/packages/passport-openidconnect/
- OpenID Connect Core 1.0 specification: https://openid.net/specs/openid-connect-core-1_0.html
- jsonwebtoken documentation: https://github.com/auth0/node-jsonwebtoken
- Microsoft identity platform ID token claims reference: https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
- Google OpenID Connect documentation: https://developers.google.com/identity/openid-connect/openid-connect
- Salesforce SAML JIT provisioning documentation: https://help.salesforce.com/s/articleView?id=xcloud.sso_jit_about.htm&type=5
- OneUptime related post link: https://oneuptime.com/blog/post/2025-08-19-sso-is-a-security-basic-not-an-enterprise-perk/view
- OneUptime related post link: https://oneuptime.com/blog/post/2025-11-20-secure-your-status-page-authentication-options/view

## Issues Found
- The benefits table overstated offboarding behavior by saying access is revoked when the IdP removes the user. JIT provisioning blocks future SSO authentication through the IdP, but it does not by itself remove local accounts, existing sessions, or other credentials. Updated the table to say new SSO access is blocked.
- The attribute mapper assigned `unknown` claim values directly into typed user fields. Updated the snippet to check string values and handle `groups` as an array of strings before assignment.
- The attribute mapper returned a `JITUserAttributes` object while only validating `externalId` and `email`, even though `firstName` and `lastName` are required by the interface. Updated the required-claim validation.
- The token validation example used `jwt.decode`, which does not verify signatures. Replaced it with `jwt.verify` using issuer, audience, and RS256 algorithm constraints.
- The email-domain example accepted malformed addresses with multiple `@` characters. Updated it to normalize case and require exactly one domain separator.

## Review Notes
The Passport.js OIDC callback pattern, standard OIDC claim names, Microsoft Entra ID claim examples, Google OIDC references, and JIT provisioning concept are technically sound. In production, OIDC signature validation should use the provider's JWKS and key rotation rather than a hard-coded public key string.
